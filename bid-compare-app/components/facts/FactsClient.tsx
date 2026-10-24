'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FactPreview } from '@/components/common/FactPreview';
import { StageSwitcher } from '@/components/common/StageSwitcher';
import { useStage } from '@/components/StageProvider';
import { EVENTS, FACT_BY_ID, FACT_FILES, QUALIFICATIONS, type QualificationRow } from '@/lib/case/facts';
import { getSnapshot } from '@/lib/case/pipeline';
import type { CaseEvent, FactFile, Stage } from '@/lib/case/types';
import { VENDOR_COLORS, VENDOR_SHORT } from '@/lib/ui/tokens';
import { cn } from '@/lib/cn';

const EVENT_META: Record<CaseEvent['type'], { label: string; color: string }> = {
  quote: { label: '报价', color: '#2563eb' },
  clarify: { label: '澄清', color: '#0f766e' },
  change: { label: '变更', color: '#7c3aed' },
  'ai-op': { label: '留痕', color: '#6b7280' },
};

const KIND_TAG: Record<FactFile['kind'], string> = {
  excel: 'XLSX',
  pdf: 'PDF',
  image: '扫描',
  chat: '聊天',
  text: 'TXT',
};

const GROUPS: { key: FactFile['group']; label: string }[] = [
  { key: 'quote', label: '供应商报价原件' },
  { key: 'baseline', label: '比选基准' },
  { key: 'event', label: '澄清与变更' },
  { key: 'qualification', label: '资格材料' },
  { key: 'output', label: '输出模板' },
];

function opsOfEvent(e: CaseEvent, stage: Stage) {
  const snap = getSnapshot(stage);
  if (e.id === 'E6') return snap.ops;
  if (e.id === 'E5') return snap.ops.filter((o) => o.time.startsWith('2026-09-19'));
  return [];
}

/** 事件在当前阶段是否已生效 */
function appliedStage(e: CaseEvent, stage: Stage): boolean {
  if (e.id === 'E5') return stage !== 'raw';
  if (e.id === 'E6') return stage === 'v2';
  return true;
}

function FileRow({ fact, active, onOpen }: { fact: FactFile; active: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={fact.desc}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
        active ? 'bg-[color:var(--orb-primary,#1d4ed8)]/10' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
      )}
    >
      <span className="shrink-0 rounded bg-black/[0.06] px-1 py-px font-mono text-[9px] dark:bg-white/10">{fact.id}</span>
      <span className={cn('flex-1 truncate text-[12px]', active && 'font-medium')}>{fact.name}</span>
      {fact.vendor && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: VENDOR_COLORS[fact.vendor] }} />}
      <span className="shrink-0 rounded bg-black/[0.05] px-1 py-px text-[9px] text-black/50 dark:bg-white/10 dark:text-white/50">
        {KIND_TAG[fact.kind]}
      </span>
    </button>
  );
}

export function FactsClient() {
  const router = useRouter();
  const { stage, mounted } = useStage();
  const effectiveStage: Stage = mounted ? stage : 'v2';
  const snap = getSnapshot(effectiveStage);
  const [selectedId, setSelectedId] = useState<string>('E6');
  const [previewFact, setPreviewFact] = useState<string | null>(null);

  useEffect(() => {
    if (!previewFact) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewFact(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewFact]);

  const selected = EVENTS.find((e) => e.id === selectedId) ?? EVENTS[EVENTS.length - 1];
  const selectedOps = opsOfEvent(selected, effectiveStage);

  return (
    <div className="flex h-[calc(100vh-96px)] min-h-[540px] flex-col gap-2 p-4 md:px-6 md:pt-4">
      {/* 紧凑头部 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-base font-semibold">事实</h1>
        <span className="text-[11px] text-black/45 dark:text-white/45">
          单一事实源 · 原件 {FACT_FILES.length} 份只读 · 事件 {EVENTS.length} 起 · 留痕 {snap.ops.length} 条 · 每个数字可回查
        </span>
        <div className="ml-auto">
          <StageSwitcher />
        </div>
      </div>

      {/* 三栏：时间线 | 事件详情 | 资料库 */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[240px_minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* 栏1：时间线 */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-black/[0.07] dark:border-white/10">
          <header className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">
            事件时间线
          </header>
          <ol className="relative min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            <span className="absolute bottom-4 left-[15px] top-2 w-px bg-black/10 dark:bg-white/15" aria-hidden />
            {EVENTS.map((e) => {
              const meta = EVENT_META[e.type];
              const applied = appliedStage(e, effectiveStage);
              const active = e.id === selectedId;
              const opsCount = opsOfEvent(e, effectiveStage).length;
              return (
                <li key={e.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setSelectedId(e.id)}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left transition-colors',
                      active ? 'bg-black/[0.06] dark:bg-white/10' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]',
                    )}
                  >
                    <span
                      className="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2"
                      style={{ background: meta.color, borderColor: 'var(--background)' }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1">
                        <span className="font-mono text-[10px] text-black/45 dark:text-white/45">{e.time.slice(5, 16)}</span>
                        <span className="rounded px-1 py-px text-[9px] font-medium" style={{ color: meta.color, background: `${meta.color}18` }}>
                          {meta.label}
                        </span>
                        {opsCount > 0 && (
                          <span className="rounded bg-black/[0.05] px-1 py-px text-[9px] text-black/45 dark:bg-white/10 dark:text-white/45">
                            {opsCount} 条留痕
                          </span>
                        )}
                        {!applied && (
                          <span className="rounded bg-[#d97706]/10 px-1 py-px text-[9px] text-[#d97706]">未应用</span>
                        )}
                      </span>
                      <span className={cn('mt-0.5 block text-xs leading-4', active ? 'font-semibold' : '')}>{e.title}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        {/* 栏2：事件详情 + 操作留痕 */}
        <section className="flex min-h-0 flex-col gap-2 overflow-y-auto rounded-2xl border border-black/[0.07] p-3 dark:border-white/10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: EVENT_META[selected.type].color }}>
                {EVENT_META[selected.type].label}
              </span>
              <span className="font-mono text-xs text-black/50 dark:text-white/50">{selected.time}</span>
              <span className="text-xs text-black/50 dark:text-white/50">· {selected.actor}</span>
            </div>
            <h2 className="mt-1 text-[15px] font-semibold leading-6">{selected.title}</h2>
          </div>
          <p className="text-[12.5px] leading-5 text-black/70 dark:text-white/70">{selected.detail}</p>

          <div className="flex flex-wrap items-center gap-1.5">
            {selected.vendors?.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 rounded-md border border-black/10 px-1.5 py-0.5 text-[11px] dark:border-white/20">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: VENDOR_COLORS[v] }} />
                {VENDOR_SHORT[v]}方
              </span>
            ))}
            {selected.affects?.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => router.push('/compare')}
                className="rounded-md bg-black/[0.05] px-1.5 py-0.5 font-mono text-[10px] hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
              >
                {c} ↗
              </button>
            ))}
          </div>

          <div>
            <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">
              关联文件（{selected.factIds.length}）
            </h4>
            <div className="flex flex-col gap-0.5">
              {selected.factIds.map((fid) => (
                <FileRow key={fid} fact={FACT_BY_ID[fid]} active={previewFact === fid} onOpen={() => setPreviewFact(previewFact === fid ? null : fid)} />
              ))}
            </div>
          </div>

          {selectedOps.length > 0 && (
            <div className="min-h-0">
              <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">
                系统执行修改（{selectedOps.length} 条 · 原值 → 新值 · 全程留痕）
              </h4>
              <div className="overflow-hidden rounded-xl border border-black/[0.07] dark:border-white/10">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-black/[0.03] text-black/50 dark:bg-white/[0.05] dark:text-white/50">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">供</th>
                      <th className="px-2 py-1.5 font-medium">分项</th>
                      <th className="px-2 py-1.5 font-medium">字段</th>
                      <th className="px-2 py-1.5 font-medium">原值 → 新值</th>
                      <th className="px-2 py-1.5 font-medium">依据</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOps.map((o, idx) => (
                      <tr key={idx} className="border-t border-black/[0.05] dark:border-white/[0.07]">
                        <td className="px-2 py-1.5">{VENDOR_SHORT[o.vendor]}</td>
                        <td className="px-2 py-1.5 font-mono">{o.code}</td>
                        <td className="whitespace-nowrap px-2 py-1.5">{o.field}</td>
                        <td className="px-2 py-1.5 font-mono whitespace-nowrap">
                          {o.oldValue} <span className="text-black/30">→</span> <span className="text-[#16a34a]">{o.newValue}</span>
                        </td>
                        <td className="max-w-[180px] truncate px-2 py-1.5 text-black/50 dark:text-white/50" title={o.basis}>{o.basis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* 栏3：资料库 + 资格登记 */}
        <section className="flex min-h-0 flex-col gap-2 rounded-2xl border border-black/[0.07] p-3 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">资料库</h3>
            <span className="text-[10px] text-black/40 dark:text-white/40">只读 · 与 AI 整理结果分开保存</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
            {GROUPS.map((g) => (
              <div key={g.key} className="mb-3">
                <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">{g.label}</h4>
                <div className="flex flex-col gap-0.5">
                  {FACT_FILES.filter((f) => f.group === g.key).map((f) => (
                    <FileRow key={f.id} fact={f} active={previewFact === f.id} onOpen={() => setPreviewFact(previewFact === f.id ? null : f.id)} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0">
            <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">资格材料登记（F09）</h4>
            <div className="overflow-hidden rounded-xl border border-black/[0.07] dark:border-white/10">
              <table className="w-full text-left text-[11px]">
                <tbody>
                  {QUALIFICATIONS.map((q: QualificationRow) => (
                    <tr key={`${q.vendor}-${q.category}`} className="border-b border-black/[0.04] last:border-0 dark:border-white/[0.06]">
                      <td className="px-2 py-1 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: VENDOR_COLORS[q.vendor] }} />
                          {VENDOR_SHORT[q.vendor]}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-black/60 dark:text-white/60">{q.category}</td>
                      <td className="px-2 py-1 font-mono text-[10px] text-black/40 dark:text-white/40">{q.docId ?? '—'}</td>
                      <td className="px-2 py-1 text-right">
                        <span
                          className="rounded px-1.5 py-px text-[9px] font-medium"
                          style={{
                            color: q.status === 'valid' ? '#16a34a' : q.status === 'missing' ? '#dc2626' : '#d97706',
                            background: q.status === 'valid' ? '#16a34a14' : q.status === 'missing' ? '#dc262614' : '#d9770614',
                          }}
                        >
                          {q.status === 'valid' ? '有效' : q.status === 'missing' ? '未提交' : '到期未续'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* 原件预览：居中大窗 */}
      {previewFact && FACT_BY_ID[previewFact] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setPreviewFact(null)} />
          <div className="relative flex h-full max-h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-[var(--background)] shadow-2xl dark:border-white/15">
            <header className="flex shrink-0 items-center gap-3 border-b border-black/[0.07] px-4 py-3 dark:border-white/10">
              <span className="shrink-0 rounded bg-black/[0.06] px-1.5 py-0.5 font-mono text-[10px] dark:bg-white/10">{previewFact}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-5">{FACT_BY_ID[previewFact].name}</p>
                <p className="truncate text-[11px] leading-4 text-black/50 dark:text-white/50">{FACT_BY_ID[previewFact].desc}</p>
              </div>
              <a
                href={`/${FACT_BY_ID[previewFact].path}`}
                download={FACT_BY_ID[previewFact].name}
                className="shrink-0 rounded-lg border border-black/10 px-2.5 py-1 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                下载原件
              </a>
              <button
                type="button"
                onClick={() => setPreviewFact(null)}
                className="shrink-0 rounded-lg px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="关闭"
              >
                ✕
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden p-3">
              <FactPreview factId={previewFact} />
            </div>
            <footer className="shrink-0 border-t border-black/[0.07] px-4 py-2 text-[10px] text-black/40 dark:border-white/10 dark:text-white/40">
              原件只读 · 永不覆盖 · AI 整理结果见对比表与台账 · Esc 关闭
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
