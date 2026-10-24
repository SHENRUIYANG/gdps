'use client';

import { useMemo, useState } from 'react';
import { CTable } from 'orbcafe-ui';
import { CellStatusView, VendorHeader } from '@/components/compare/CellStatusView';
import { RangeBar } from '@/components/compare/RangeBar';
import { SourceDrawer, type DrawerTarget } from '@/components/common/SourceDrawer';
import { StageSwitcher } from '@/components/common/StageSwitcher';
import { useStage } from '@/components/StageProvider';
import { getSnapshot, STAGE_LABEL } from '@/lib/case/pipeline';
import { downloadLedgerCsv } from '@/lib/ledger/export';
import type { BoqCode, CompareCell, Stage, VendorId } from '@/lib/case/types';
import { cn } from '@/lib/cn';

const VENDORS: VendorId[] = ['A', 'B', 'C', 'D'];

/** 行数据：金额为可直接排序求和的数值；单元格元信息走 cellsByRow 查找 */
interface RowModel {
  id: string;
  code: string;
  name: string;
  unit: string;
  quantity: number | null;
  A: number | null;
  B: number | null;
  C: number | null;
  D: number | null;
  rangeLow: number;
  issueCount: number;
}

export function CompareClient() {
  const { stage, mounted } = useStage();
  const [basis, setBasis] = useState<'taxed' | 'untaxed'>('taxed');
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);

  const effectiveStage: Stage = mounted ? stage : 'v2';
  const snap = useMemo(() => getSnapshot(effectiveStage), [effectiveStage]);

  /** code → 四家 CompareCell 元信息（渲染与抽屉用） */
  const cellsByRow = useMemo(() => {
    const map: Record<string, Record<VendorId, CompareCell>> = {};
    for (const r of snap.rows) map[r.code] = r.cells;
    return map;
  }, [snap]);

  const { rows, totalRow } = useMemo(() => {
    const amountOf = (c: CompareCell) => (basis === 'taxed' ? c.taxed : c.untaxed);
    const activeIssuesOf = (r: (typeof snap.rows)[number]) =>
      snap.issues.filter((i) => r.issues.includes(i.id) && i.status !== 'resolved');
    const all = snap.rows.map((r) => ({
      id: r.code,
      code: r.code,
      name: r.name,
      unit: r.unit,
      quantity: r.quantity,
      A: amountOf(r.cells.A),
      B: amountOf(r.cells.B),
      C: amountOf(r.cells.C),
      D: amountOf(r.cells.D),
      rangeLow: r.range.low,
      issueCount: activeIssuesOf(r).length,
    }));
    const filtered = onlyIssues
      ? all.filter((row) => {
          const r = snap.rows.find((x) => x.code === row.id)!;
          return (
            row.issueCount > 0 ||
            VENDORS.some((v) => !['ok'].includes(r.cells[v].status))
          );
        })
      : all;
    const total = {
      id: 'TOTAL',
      code: '合计',
      name: '四家总价（含验算）',
      unit: '',
      quantity: null,
      A: snap.summaries.A.taxedTotal ?? snap.summaries.A.untaxedTotal,
      B: basis === 'taxed' ? snap.summaries.B.taxedTotal : snap.summaries.B.untaxedTotal,
      C: snap.summaries.C.taxedTotal ?? snap.summaries.C.untaxedTotal,
      D: snap.summaries.D.taxedTotal ?? snap.summaries.D.untaxedTotal,
      rangeLow: 0,
      issueCount: 0,
    };
    return { rows: [...filtered, total], totalRow: total };
  }, [snap, onlyIssues, basis]);

  const isTotal = (row: RowModel) => row.id === 'TOTAL';

  const columns = useMemo(() => {
    const cellRender = (vendor: VendorId) => (value: number | null, row: RowModel) => {
      if (isTotal(row)) {
        const s = snap.summaries[vendor];
        const val = basis === 'taxed' ? s.taxedTotal : s.untaxedTotal;
        return (
          <div className="flex items-baseline justify-end gap-1.5 whitespace-nowrap pr-2">
            <span className={cn('font-mono text-[13px] font-semibold tabular-nums', !s.verified && val == null && 'text-black/40 dark:text-white/40')}>
              {val != null ? val.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '—'}
            </span>
            <span className="text-[10px]" style={{ color: s.verified ? '#16a34a' : '#d97706' }} title={s.totalNote}>
              {s.verified ? '✓' : '⚠'}
            </span>
          </div>
        );
      }
      const cell = cellsByRow[row.code]?.[vendor];
      if (!cell) return null;
      return (
        <CellStatusView
          cell={cell}
          basis={basis}
          originalAmount={vendor === 'C' && cell.code === 'C04' ? 2181.8 : null}
          onClick={cell.status === 'missing' ? undefined : () => setDrawer({ vendor, code: row.code as BoqCode })}
        />
      );
    };

    return [
      {
        id: 'code',
        label: '编号',
        minWidth: 72,
        render: (v: string, row: RowModel) =>
          isTotal(row) ? <span className="pl-1 text-[13px] font-semibold">{v}</span> : <span className="pl-1 font-mono text-xs">{v}</span>,
      },
      {
        id: 'name',
        label: '分项 / 工作内容',
        minWidth: 200,
        render: (v: string, row: RowModel) =>
          isTotal(row) ? <span className="text-[13px] font-semibold">{v}</span> : <span className="text-[13px]">{v}</span>,
      },
      { id: 'unit', label: '单位', minWidth: 60 },
      {
        id: 'quantity',
        label: '数量',
        numeric: true,
        minWidth: 84,
        render: (v: number | null, row: RowModel) => {
          if (isTotal(row)) return null;
          const r = snap.rows.find((x) => x.code === row.id)!;
          return (
            <span className="pr-2 font-mono text-xs tabular-nums">
              {v}
              {r.prevQuantity != null && (
                <span className="ml-1 rounded bg-[#2563eb]/10 px-1 py-px text-[9px] text-[#2563eb]">
                  {r.prevQuantity}→{v}
                </span>
              )}
            </span>
          );
        },
      },
      ...VENDORS.map((v) => ({
        id: v,
        label: <VendorHeader key={v} vendor={v} basis={basis} />,
        numeric: true,
        minWidth: 128,
        render: cellRender(v),
      })),
      {
        id: 'rangeLow',
        label: '未税单价参考区间',
        minWidth: 150,
        render: (_: number, row: RowModel) => {
          if (isTotal(row)) return <span className="text-[10px] text-black/40 dark:text-white/40">系统不推荐中标 · 评审定夺</span>;
          const r = snap.rows.find((x) => x.code === row.id)!;
          return <RangeBar code={row.code as BoqCode} cells={r.cells} low={r.range.low} high={r.range.high} />;
        },
      },
      {
        id: 'issueCount',
        label: '差异及待核对',
        numeric: true,
        minWidth: 190,
        render: (v: number, row: RowModel) => {
          if (isTotal(row)) return null;
          if (!v) return <span className="text-xs text-black/25 dark:text-white/25">—</span>;
          const r = snap.rows.find((x) => x.code === row.id)!;
          const activeIssues = snap.issues.filter((i) => r.issues.includes(i.id) && i.status !== 'resolved');
          return (
            <div className="flex flex-wrap gap-1">
              {activeIssues.map((i) => (
                <span
                  key={i.id}
                  title={i.detail}
                  className="cursor-default whitespace-nowrap rounded px-1.5 py-px text-[9px] font-medium"
                  style={{
                    color: i.status === 'kept-open' ? '#d97706' : '#dc2626',
                    background: i.status === 'kept-open' ? '#d9770614' : '#dc262614',
                  }}
                >
                  {i.vendor === 'A' ? '甲' : i.vendor === 'B' ? '乙' : i.vendor === 'C' ? '丙' : '丁'}·{i.code}{' '}
                  {i.status === 'kept-open' ? '保留线索' : '待核对'}
                </span>
              ))}
            </div>
          );
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basis, snap, cellsByRow, effectiveStage]);

  return (
    <div className="flex h-[calc(100vh-96px)] min-h-[540px] flex-col gap-2 p-4 md:px-6 md:pt-4">
      {/* 紧凑头部：无框、左对齐、单行 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-base font-semibold">对比表</h1>
        <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[11px] dark:bg-white/10">
          {mounted ? STAGE_LABEL[effectiveStage] : STAGE_LABEL.v2}
        </span>
        {effectiveStage === 'v2' && (
          <span className="rounded bg-[#2563eb]/10 px-1.5 py-0.5 text-[11px] text-[#2563eb]">V1 基线已保留</span>
        )}
        <span className="hidden text-[11px] text-black/45 lg:inline dark:text-white/45">
          点金额看折算链与原件 · 区间列按未税单价画点
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-black/10 text-xs dark:border-white/20">
            {(['taxed', 'untaxed'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBasis(b)}
                className={cn(
                  'px-3 py-1',
                  basis === b ? 'bg-[color:var(--orb-primary,#1d4ed8)] text-white' : 'hover:bg-black/5 dark:hover:bg-white/10',
                )}
              >
                {b === 'taxed' ? '含税' : '未税'}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={onlyIssues}
              onChange={(e) => setOnlyIssues(e.target.checked)}
              className="h-3.5 w-3.5 accent-[color:var(--orb-primary,#1d4ed8)]"
            />
            只看异常行
          </label>
          <StageSwitcher />
          <button
            type="button"
            onClick={() => downloadLedgerCsv(effectiveStage)}
            className="rounded-lg bg-[color:var(--orb-primary,#1d4ed8)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            导出台账初稿
          </button>
        </div>
      </div>

      {/* 完整 CTable：标准工具栏（搜索/列管理/分组/汇总/导出 CSV/保存布局） */}
      <CTable
        appId="shannan-bid-compare"
        tableKey="compare"
        title="统一比选清单 C01–C15 × 四家报价"
        columns={columns}
        rows={rows}
        rowKey="id"
        showToolbar
        showSummary
        rowsPerPage={20}
        maxHeight="calc(100vh - 170px)"
      />

      <SourceDrawer target={drawer} stage={effectiveStage} onClose={() => setDrawer(null)} />
    </div>
  );
}
