'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CPaper, CTypography } from 'orbcafe-ui';
import { StageSwitcher } from '@/components/common/StageSwitcher';
import { useStage } from '@/components/StageProvider';
import { getSnapshot } from '@/lib/case/pipeline';
import { EVENTS, QUALIFICATIONS } from '@/lib/case/facts';
import { fmtMoney } from '@/lib/case/rules';
import type { Stage, VendorId } from '@/lib/case/types';
import { ISSUE_STATUS_COLOR, ISSUE_STATUS_LABEL, SEVERITY_COLOR, SEVERITY_LABEL, VENDOR_COLORS, VENDOR_SHORT } from '@/lib/ui/tokens';

const STAGE_SUMMARY: Record<Stage, string> = {
  raw: '四家报价已归集并对齐 15 项统一清单，系统按计算规则完成逐项核对，共发现 12 条待核查线索：乙 6 条（税率未写、C09 单价空白、C11 整行漏报、C07 重复、合计加总误差、C08 超参考区间）、丙 2 条（C04 金额抄错、C13 附件单列）、丁 2 条（C04 数量 16≠18、C14 项≠台班）、资质待补 2 条。乙税率未给，按规则不得默认补写，含税总价暂不可得。',
  clarified:
    'CLARIFY-01 供应商澄清纪要已应用：9 条线索处理完毕（乙补 C09/C11、C07 去重、税率确认 6%；丙 C04 按乘积更正、C13 加计；丁 C04 改 18 点、C14 按项均分 771.68 元/台班），台账 V1 就绪。乙 C08 未税 500 元/根维持报价，超区间线索保留待商务评审；乙、丁资质待补事项未关闭。',
  v2: 'CHANGE-01 工程量变更已应用：C08 低应变检测由 60 根调整为 72 根，四家沿用已澄清单价重算，另存 V2 台账并保留 V1 价格基线与差异。系统不推荐中标——资质、价格合理性与最终比选结果由商务部和评审组判断。',
};

/** 计算规则红线：每条都与页面上的数据现象一一对应 */
const RULES = [
  '税率缺失：不得默认补写，含税总价按规则标注"不可得"',
  '单价超参考区间：仅提示异常，不改写报价原值',
  '每一处修改均留痕（谁 · 何时 · 依据），事实层只读',
  '系统不推荐中标：资质与价格合理性由评审人员判断',
];

const money0 = (v: number) => Math.round(v).toLocaleString('zh-CN');

function stageDiff(stage: Stage): string {
  const c = getSnapshot('clarified').summaries;
  const v = getSnapshot('v2').summaries;
  const d = (id: VendorId) => (v[id].taxedTotal ?? 0) - (c[id].taxedTotal ?? 0);
  return `甲 ${fmtMoney(d('A'))}、乙 ${fmtMoney(d('B'))}、丙 ${fmtMoney(d('C'))}、丁 ${fmtMoney(d('D'))}（含税）`;
}

// 注意：orbcafe-ui 的 sx 数值 padding/gap 会 ×8（主题倍率），必须用字符串像素值
const card = { padding: '12px', borderRadius: '14px' } as const;

/** 单屏总览：量出内容区实际高度，整页 overflow-hidden，不出现页面级滚动 */
export function OverviewClient() {
  const router = useRouter();
  const { stage, mounted } = useStage();
  const snap = useMemo(() => getSnapshot(stage), [stage]);

  // 可用高度 = 视口 - 页面根顶部偏移 - 内容区底部 12px 内边距
  const rootRef = useRef<HTMLDivElement>(null);
  const [fitHeight, setFitHeight] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      const el = rootRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setFitHeight(Math.max(560, window.innerHeight - top - 12));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const openIssues = snap.issues.filter((i) => i.status === 'open');
  const keptIssues = snap.issues.filter((i) => i.status === 'kept-open');
  const resolvedCount = snap.issues.filter((i) => i.status === 'resolved').length;
  const activeIssues = [...openIssues, ...keptIssues];
  const pendingQuals = QUALIFICATIONS.filter((q) => q.status !== 'valid');
  const recentOps = [...snap.ops].slice(-4).reverse();

  // 总价口径：raw 阶段乙税率未定，四家统一用未税对比；澄清后用含税
  const useUntaxed = stage === 'raw';
  const totals = (['A', 'B', 'C', 'D'] as VendorId[]).map((id) => ({
    id,
    label: `${VENDOR_SHORT[id]} · ${useUntaxed ? '未税' : '含税'}`,
    value: useUntaxed ? snap.summaries[id].untaxedTotal ?? 0 : snap.summaries[id].taxedTotal ?? 0,
    color: VENDOR_COLORS[id],
    note: snap.summaries[id].totalNote,
  }));
  const maxTotal = Math.max(...totals.map((t) => t.value), 1);

  const ledgerBadge = stage === 'v2' ? '台账 V2' : '台账 V1';
  const summary =
    stage === 'v2' ? `${STAGE_SUMMARY.v2} 合计影响：${stageDiff(stage)}` : STAGE_SUMMARY[stage];

  const kpis = [
    { value: 4, label: '参与供应商', sub: 'Excel / PDF / 扫描件 / 微信截图 · 已完成澄清 4 家' },
    { value: 15, label: '统一清单对齐', sub: 'C01–C15 · 同范围同单位 · 四家可比' },
    {
      value: activeIssues.length,
      label: '未决线索',
      sub: `已处理 ${resolvedCount} 条 · 保留 ${keptIssues.length} 条 · 总数 ${snap.issues.length} 条`,
    },
    { value: pendingQuals.length, label: '待补资质', sub: '应交材料 8 份 · 评审前必须关闭' },
  ];

  return (
    <div
      ref={rootRef}
      style={fitHeight ? { height: fitHeight } : undefined}
      className="flex min-h-0 flex-col gap-2.5 overflow-hidden pt-1"
    >
      {/* 页头：标题 + 阶段切换 */}
      <div className="flex shrink-0 items-end justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-black/45 dark:text-white/45">
            GC-017 · 园区一批现场测量与检测工作 · 上海山南勘测设计有限公司 商务部
          </p>
          <div className="mt-0.5 flex items-center gap-2.5">
            <CTypography variant="h3" className="leading-tight">
              分包比选 · 报价归集比对
            </CTypography>
            <span className="rounded-lg bg-[color:var(--orb-primary,#1d4ed8)] px-2 py-0.5 text-xs font-semibold text-white">
              {ledgerBadge}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StageSwitcher />
          <span className="text-[10px] text-black/40 dark:text-white/40">
            阶段切换全局生效 · 事实层只读，推导层按纪要推进
          </span>
        </div>
      </div>

      {/* KPI 横带 */}
      <CPaper sx={{ padding: '10px 0', borderRadius: '14px' }} className="shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x md:divide-black/[0.06] dark:md:divide-white/10">
          {kpis.map((k) => (
            <div key={k.label} className="flex items-center gap-3 px-4 py-1">
              <span className="text-[30px] font-semibold leading-none tabular-nums">{k.value}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-4">{k.label}</p>
                <p className="mt-0.5 truncate text-[11px] leading-4 text-black/45 dark:text-white/45" title={k.sub}>
                  {k.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CPaper>

      {/* 三列主体：各列等高，余量由列尾卡片吸收 */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-y-auto lg:grid-cols-3">
        {/* 列一：总价对比 + 资质待补 + 规则红线 */}
        <div className="flex min-h-0 flex-col gap-2.5">
          <CPaper sx={card} className="shrink-0">
            <div className="flex items-baseline justify-between gap-2">
              <CTypography variant="subtitle1">四家总价对比</CTypography>
              <button
                type="button"
                className="shrink-0 text-xs text-[color:var(--orb-primary,#1d4ed8)] hover:underline"
                onClick={() => router.push('/compare')}
              >
                对比表 →
              </button>
            </div>
            <p className="mt-0.5 text-[11px] leading-4 text-black/45 dark:text-white/45">
              {useUntaxed
                ? '未税口径 · 乙税率未定，按规则不得默认折算含税价'
                : '含税口径 · 澄清后可比 · 不构成中标建议'}
            </p>
            <div className="mt-2 flex flex-col gap-2.5">
              {totals.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={`${t.label} ${money0(t.value)} 元${t.note ? ` · ${t.note}` : ''}`}
                  onClick={() => router.push('/compare')}
                  className="flex w-full flex-col gap-1 rounded-lg text-left"
                >
                  <span className="flex w-full items-center gap-3">
                    <span className="w-12 shrink-0 text-xs text-black/70 dark:text-white/70">{t.label}</span>
                    <span className="h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/10">
                      <span
                        className="block h-full rounded-full transition-[width] duration-300"
                        style={{ width: `${Math.max((t.value / maxTotal) * 100, 1.5)}%`, background: t.color }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums">
                      {money0(t.value)}
                    </span>
                  </span>
                  {t.note && (
                    <span className="w-full truncate pl-[60px] text-[10px] leading-4 text-black/40 dark:text-white/40">
                      {t.note}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CPaper>

          <CPaper sx={card} className="shrink-0">
            <div className="flex items-baseline justify-between gap-2">
              <CTypography variant="subtitle1">资格材料 · 待补事项</CTypography>
              <span className="text-[10px] text-black/40 dark:text-white/40">依据 F09 资格材料登记</span>
            </div>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {pendingQuals.map((q) => (
                <div
                  key={`${q.vendor}-${q.category}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-black/[0.06] bg-black/[0.015] px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium leading-4">
                      {VENDOR_SHORT[q.vendor]}方 · {q.category}
                    </p>
                    <p className="truncate text-[11px] leading-4 text-black/50 dark:text-white/50" title={q.note}>
                      {q.note}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      color: q.status === 'missing' ? '#dc2626' : '#d97706',
                      background: q.status === 'missing' ? '#dc262614' : '#d9770614',
                    }}
                  >
                    {q.status === 'missing' ? '未提交' : '到期未续'}
                  </span>
                </div>
              ))}
            </div>
          </CPaper>

          <CPaper sx={card} className="flex min-h-0 flex-1 flex-col">
            <CTypography variant="subtitle1" className="shrink-0">
              计算规则 · 红线
            </CTypography>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {RULES.map((r) => (
                <li key={r} className="flex items-start gap-2 text-[11.5px] leading-4 text-black/60 dark:text-white/60">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-black/30 dark:bg-white/30" />
                  {r}
                </li>
              ))}
            </ul>
          </CPaper>
        </div>

        {/* 列二：待核查线索 */}
        <CPaper sx={card} className="flex min-h-0 flex-col">
          <div className="flex shrink-0 items-baseline justify-between gap-2">
            <CTypography variant="subtitle1">
              待核查线索 <span className="text-xs font-normal text-black/45 dark:text-white/45">{activeIssues.length} 条未决</span>
            </CTypography>
            <button
              type="button"
              className="shrink-0 text-xs text-[color:var(--orb-primary,#1d4ed8)] hover:underline"
              onClick={() => router.push('/compare')}
            >
              全量清单 →
            </button>
          </div>
          <ul className="mt-1.5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {activeIssues.map((issue) => (
              <li
                key={issue.id}
                title={`${issue.title} · ${issue.detail}（依据：${issue.basis}）`}
                className="flex items-start gap-2 rounded-lg border border-black/[0.06] bg-black/[0.015] px-2.5 py-1.5 transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.07]"
              >
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: SEVERITY_COLOR[issue.severity] }}
                  aria-label={`严重度 ${SEVERITY_LABEL[issue.severity]}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-x-2">
                    <span className="truncate text-[12.5px] font-medium leading-4">{issue.title}</span>
                    <span
                      className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        color: ISSUE_STATUS_COLOR[issue.status],
                        background: `${ISSUE_STATUS_COLOR[issue.status]}14`,
                      }}
                    >
                      {ISSUE_STATUS_LABEL[issue.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] leading-4 text-black/50 dark:text-white/50">
                    {issue.detail}
                  </p>
                </div>
                {issue.vendor && (
                  <span className="mt-0.5 shrink-0 rounded-md border border-black/10 px-1.5 py-0.5 text-[10px] text-black/60 dark:border-white/20 dark:text-white/60">
                    {VENDOR_SHORT[issue.vendor]}
                    {issue.code ? ` · ${issue.code}` : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {resolvedCount > 0 && (
            <p className="mt-1.5 shrink-0 text-[10px] text-black/40 dark:text-white/40">
              本阶段已处理 {resolvedCount} 条 · 保留 {keptIssues.length} 条（全量 {snap.issues.length} 条见对比表）
            </p>
          )}
        </CPaper>

        {/* 列三：事件时间线 + 修改留痕 + 阶段说明 */}
        <div className="flex min-h-0 flex-col gap-2.5">
          <CPaper sx={card} className="shrink-0">
            <div className="flex items-baseline justify-between gap-2">
              <CTypography variant="subtitle1">事件时间线</CTypography>
              <button
                type="button"
                className="shrink-0 text-xs text-[color:var(--orb-primary,#1d4ed8)] hover:underline"
                onClick={() => router.push('/facts')}
              >
                全部事件 →
              </button>
            </div>
            <ul className="mt-1.5 flex flex-col gap-1">
              {EVENTS.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start gap-2.5 rounded-lg border border-black/[0.06] bg-black/[0.015] px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <span className="mt-0.5 shrink-0 rounded-md bg-black/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-black/60 dark:bg-white/10 dark:text-white/60">
                    {e.time.slice(5, 16)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium leading-4" title={e.title}>
                      {e.title}
                    </p>
                    <p className="truncate text-[11px] leading-4 text-black/50 dark:text-white/50">{e.actor}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CPaper>

          <CPaper sx={card} className="shrink-0">
            <div className="flex items-baseline justify-between gap-2">
              <CTypography variant="subtitle1">
                修改留痕 <span className="text-xs font-normal text-black/45 dark:text-white/45">{snap.ops.length} 条</span>
              </CTypography>
              <button
                type="button"
                className="shrink-0 text-xs text-[color:var(--orb-primary,#1d4ed8)] hover:underline"
                onClick={() => router.push('/facts')}
              >
                留痕明细 →
              </button>
            </div>
            {recentOps.length === 0 ? (
              <p className="mt-1.5 text-[11px] leading-4 text-black/45 dark:text-white/45">
                初始归集阶段无修改 · 事实层只读，澄清/变更的每一处改动均记录于事实页
              </p>
            ) : (
              <ul className="mt-1.5 flex flex-col gap-1">
                {recentOps.map((op, i) => (
                  <li
                    key={`${op.vendor}-${op.code}-${op.field}-${i}`}
                    title={`${op.time} ${op.operator}：${op.field} ${op.oldValue} → ${op.newValue}（${op.basis}）`}
                    className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-black/[0.015] px-2.5 py-1.5 text-[11px] dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <span className="shrink-0 font-medium">
                      {VENDOR_SHORT[op.vendor]} · {op.code}
                    </span>
                    <span className="min-w-0 truncate text-black/55 dark:text-white/55">
                      {op.field}：{op.oldValue} → {op.newValue}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CPaper>

          <CPaper sx={card} className="flex min-h-0 flex-1 flex-col">
            <CTypography variant="subtitle1" className="shrink-0">
              阶段说明
            </CTypography>
            <p title={mounted ? summary : STAGE_SUMMARY.v2} className="mt-1.5 min-h-0 flex-1 overflow-y-auto text-[12px] leading-5 text-black/60 dark:text-white/60">
              {mounted ? summary : STAGE_SUMMARY.v2}
            </p>
          </CPaper>
        </div>
      </div>
    </div>
  );
}
