'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { FACT_BY_ID } from '@/lib/case/facts';

interface SheetGrid {
  name: string;
  rows: string[][];
}

/** 原件预览：图片 / PDF / 文本 / Excel 全部内嵌只读渲染。原件永不覆盖。 */
export function FactPreview({ factId }: { factId: string }) {
  const fact = FACT_BY_ID[factId];
  const [text, setText] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SheetGrid[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);

  useEffect(() => {
    if (!fact) return;
    let alive = true;
    setText(null);
    setSheets(null);
    setError(null);
    setSheetIdx(0);
    if (fact.kind === 'text') {
      fetch(`/${fact.path}`)
        .then((r) => r.text())
        .then((t) => alive && setText(t))
        .catch(() => alive && setError('原件加载失败，请重试'));
    } else if (fact.kind === 'excel') {
      fetch(`/${fact.path}`)
        .then((r) => r.arrayBuffer())
        .then((buf) => {
          if (!alive) return;
          const wb = XLSX.read(buf, { type: 'array' });
          const grids: SheetGrid[] = wb.SheetNames.map((name) => {
            const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
              header: 1,
              defval: '',
              raw: false,
            });
            const rows = raw.map((row) => row.map((c) => (c == null ? '' : String(c))));
            while (rows.length > 1 && rows[rows.length - 1].every((c) => c === '')) rows.pop();
            return { name, rows };
          });
          setSheets(grids);
        })
        .catch(() => alive && setError('原件加载失败，请重试'));
    }
    return () => {
      alive = false;
    };
  }, [fact]);

  if (!fact) return null;

  if (error) {
    return <div className="flex h-full items-center justify-center text-xs text-[#dc2626]">{error}</div>;
  }

  if (fact.kind === 'image' || fact.kind === 'chat') {
    return (
      <div className="flex h-full items-center justify-center overflow-auto rounded-lg border border-black/10 bg-black/[0.03] p-2 dark:border-white/15 dark:bg-white/[0.04]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/${fact.path}`} alt={fact.name} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  if (fact.kind === 'pdf') {
    return <iframe src={`/${fact.path}`} title={fact.name} className="h-full w-full rounded-lg border border-black/10 dark:border-white/15" />;
  }

  if (fact.kind === 'text') {
    return (
      <pre className="h-full overflow-auto whitespace-pre-wrap rounded-lg border border-black/10 bg-black/[0.03] p-3 text-[11.5px] leading-5 dark:border-white/15 dark:bg-white/[0.04]">
        {text ?? '加载中…'}
      </pre>
    );
  }

  if (fact.kind === 'excel') {
    if (!sheets) return <div className="flex h-full items-center justify-center text-xs opacity-50">加载中…</div>;
    const grid = sheets[Math.min(sheetIdx, sheets.length - 1)];
    const maxCols = grid.rows.reduce((m, r) => Math.max(m, r.length), 0);
    return (
      <div className="flex h-full flex-col rounded-lg border border-black/10 dark:border-white/15">
        {sheets.length > 1 && (
          <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-black/[0.07] px-2 pt-1.5 dark:border-white/10">
            {sheets.map((s, i) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setSheetIdx(i)}
                className={cnSheetTab(i === sheetIdx)}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full max-w-none border-collapse text-[11.5px]">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 w-9 border-b border-r border-black/[0.1] bg-black/[0.05] px-1 py-1 text-center font-mono text-[9px] font-normal text-black/40 dark:border-white/15 dark:bg-white/[0.08] dark:text-white/40">
                  #
                </th>
                {Array.from({ length: maxCols }, (_, ci) => (
                  <th
                    key={ci}
                    className="sticky top-0 z-10 min-w-[76px] border-b border-r border-black/[0.1] bg-black/[0.05] px-2 py-1 text-center font-mono text-[9px] font-normal text-black/40 dark:border-white/15 dark:bg-white/[0.08] dark:text-white/40"
                  >
                    {XLSX.utils.encode_col(ci)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((row, ri) => (
                <tr key={ri} className="group">
                  <td className="sticky left-0 z-10 border-b border-r border-black/[0.08] bg-black/[0.03] px-1 py-1 text-center font-mono text-[9px] text-black/40 group-hover:bg-black/[0.06] dark:border-white/12 dark:bg-white/[0.05] dark:text-white/40 dark:group-hover:bg-white/[0.1]">
                    {ri + 1}
                  </td>
                  {Array.from({ length: maxCols }, (_, ci) => {
                    const v = row[ci] ?? '';
                    const numeric = v !== '' && !Number.isNaN(Number(v));
                    return (
                      <td
                        key={ci}
                        className={
                          'max-w-[220px] truncate border-b border-r border-black/[0.06] px-2 py-1 group-hover:bg-black/[0.03] dark:border-white/[0.08] dark:group-hover:bg-white/[0.06] ' +
                          (numeric ? 'text-right font-mono tabular-nums' : '')
                        }
                        title={v}
                      >
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-black/[0.07] px-3 py-1.5 text-[10px] text-black/40 dark:border-white/10 dark:text-white/40">
          <span>
            {grid.name} · {grid.rows.length} 行 × {maxCols} 列
          </span>
          <a href={`/${fact.path}`} download={fact.name} className="hover:text-[color:var(--orb-primary,#1d4ed8)] hover:underline">
            下载原件
          </a>
        </div>
      </div>
    );
  }

  return null;
}

function cnSheetTab(active: boolean) {
  return (
    'whitespace-nowrap rounded-t-md border border-b-0 px-2.5 py-1 text-[11px] transition-colors ' +
    (active
      ? 'border-black/[0.1] bg-[var(--background)] font-medium dark:border-white/15'
      : 'border-transparent text-black/50 hover:bg-black/[0.04] dark:text-white/50 dark:hover:bg-white/[0.06]')
  );
}
