'use client';

import { useEffect, useState } from 'react';
import { QUALIFICATIONS } from '@/lib/case/facts';
import { getSnapshot } from '@/lib/case/pipeline';
import { fmtMoney } from '@/lib/case/rules';
import { VENDOR_BY_ID } from '@/lib/case/vendors';
import type { BoqCode, Stage, VendorId } from '@/lib/case/types';
import { ISSUE_STATUS_LABEL, VENDOR_COLORS, VENDOR_SHORT } from '@/lib/ui/tokens';
import { cn } from '@/lib/cn';
import { FactPreview } from '@/components/common/FactPreview';

export interface DrawerTarget {
  vendor: VendorId;
  code: BoqCode;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-black/[0.07] bg-black/[0.015] p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">{title}</h4>
      {children}
    </section>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="shrink-0 text-[11px] text-black/45 dark:text-white/45">{k}</span>
      <span className="text-right text-xs font-medium">{v}</span>
    </div>
  );
}

/** 单元格详情抽屉：折算链 + 原件定位 + 线索 + 留痕（"一点就找到原报价在哪一页"） */
export function SourceDrawer({ target, stage, onClose }: {
  target: DrawerTarget | null;
  stage: Stage;
  onClose: () => void;
}) {
  const [showFact, setShowFact] = useState<string | null>(null);

  useEffect(() => setShowFact(null), [target]);

  if (!target) return null;
  const { vendor, code } = target;
  const snap = getSnapshot(stage);
  const row = snap.rows.find((r) => r.code === code)!;
  const cell = row.cells[vendor];
  const quote = VENDOR_BY_ID[vendor];
  const rawLine = quote.lines.find((l) => l.code === code && !l.duplicateOf) ?? quote.lines.find((l) => l.code === code);
  const issues = snap.issues.filter((i) => i.vendor === vendor && (i.code === code || i.kind === 'qualification'));
  const ops = snap.ops.filter((o) => o.vendor === vendor && o.code === code);
  const range = row.range;
  const qual = QUALIFICATIONS.filter((q) => q.vendor === vendor && q.status !== 'valid');

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="flex-1 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="flex h-full w-[440px] max-w-[92vw] flex-col gap-3 overflow-y-auto bg-[var(--background)] p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-white"
                style={{ background: VENDOR_COLORS[vendor] }}
              >
                {VENDOR_SHORT[vendor]}方 · {quote.format}
              </span>
              <span className="font-mono text-xs">{code}</span>
              <span className="text-[13px] font-semibold">{row.name}</span>
            </div>
            <p className="mt-1 text-[11px] text-black/45 dark:text-white/45">
              {quote.name} · {quote.version} · 报价口径：{quote.basis === 'taxed' ? '含税' : '未税'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <Section title="原始报价（照抄原件）">
          {rawLine ? (
            <>
              <KV k="原始名称" v={rawLine.rawName} />
              <KV k="数量 × 单价" v={`${rawLine.rawQty ?? '—'} ${rawLine.rawUnit} × ${rawLine.rawUnitPrice != null ? fmtMoney(rawLine.rawUnitPrice) : '空白'} 元`} />
              <KV k="原报税率" v={rawLine.taxRate != null ? `${rawLine.taxRate * 100}%` : '未写（不得默认补写）'} />
              <KV k="原报金额" v={rawLine.rawAmount != null ? `${fmtMoney(rawLine.rawAmount)} 元（${rawLine.priceBasis === 'taxed' ? '含税' : '未税'}）` : '—'} />
            </>
          ) : (
            <p className="text-xs text-black/50 dark:text-white/50">该分项在原件中整行缺失（漏报）。</p>
          )}
        </Section>

        <Section title="统一口径 · 折算依据">
          <KV k="统一数量" v={`${row.quantity} ${row.unit}${row.prevQuantity ? `（由 ${row.prevQuantity} 变更，CHANGE-01）` : ''}`} />
          <KV k="未税金额" v={cell.untaxed != null ? `${fmtMoney(cell.untaxed)} 元` : '—'} />
          <KV k="税额" v={cell.tax != null ? `${fmtMoney(cell.tax)} 元` : '—'} />
          <KV k="含税金额" v={cell.taxed != null ? `${fmtMoney(cell.taxed)} 元` : '—'} />
          <p className="mt-1.5 rounded-lg bg-black/[0.04] p-2 text-[11px] leading-5 dark:bg-white/[0.06]">{cell.basisText}</p>
        </Section>

        <Section title={`参考区间比对（未税 ${range.low}–${range.high} 元/${row.unit}）`}>
          {cell.untaxedUnitPrice != null ? (
            <KV
              k="折算未税单价"
              v={
                <span className={cn(cell.status === 'out-of-range' && 'font-semibold text-[#d97706]')}>
                  {fmtMoney(cell.untaxedUnitPrice)} 元 · {cell.untaxedUnitPrice < range.low ? '低于下限' : cell.untaxedUnitPrice > range.high ? '高于上限（线索保留，不改写）' : '区间内'}
                </span>
              }
            />
          ) : (
            <p className="text-xs text-black/50 dark:text-white/50">单价缺失或单位不可比，暂不做区间提示。</p>
          )}
        </Section>

        {issues.length > 0 && (
          <Section title="相关线索">
            {issues.map((i) => (
              <div key={i.id} className="py-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{i.title}</span>
                  <span className="rounded bg-black/[0.06] px-1.5 py-px text-[10px] dark:bg-white/10">
                    {ISSUE_STATUS_LABEL[i.status]}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-4 text-black/50 dark:text-white/50">{i.detail}</p>
              </div>
            ))}
          </Section>
        )}

        {qual.length > 0 && (
          <Section title="该供应商资质待补">
            {qual.map((q) => (
              <KV key={q.category} k={q.category} v={<span className="text-[#d97706]">{q.note}</span>} />
            ))}
          </Section>
        )}

        {ops.length > 0 && (
          <Section title="操作留痕（原值 → 新值）">
            {ops.map((o, idx) => (
              <div key={idx} className="border-b border-black/5 py-1.5 last:border-0 dark:border-white/10">
                <p className="text-xs font-medium">{o.field}</p>
                <p className="mt-0.5 font-mono text-[11px] text-black/60 dark:text-white/60">
                  {o.oldValue} <span className="text-black/30">→</span> <span className="text-[#16a34a]">{o.newValue}</span>
                </p>
                <p className="text-[10px] text-black/40 dark:text-white/40">{o.time} · {o.operator} · {o.basis}</p>
              </div>
            ))}
          </Section>
        )}

        <Section title="原件定位（只读 · 永不覆盖）">
          <p className="mb-2 font-mono text-[11px] text-black/60 dark:text-white/60">{cell.source.label}</p>
          {rawLine?.note && <p className="mb-2 text-[11px] leading-5 text-black/50 dark:text-white/50">{rawLine.note}</p>}
          <button
            type="button"
            onClick={() => setShowFact(showFact === cell.source.factId ? null : cell.source.factId)}
            className="rounded-lg bg-[color:var(--orb-primary,#1d4ed8)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            {showFact === cell.source.factId ? '收起原件' : '查看原件'}
          </button>
          {showFact && (
            <div className="mt-3">
              <FactPreview factId={showFact} />
            </div>
          )}
        </Section>
      </aside>
    </div>
  );
}
