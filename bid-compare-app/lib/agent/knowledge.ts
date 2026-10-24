import { FACT_FILES } from '@/lib/case/facts';
import { getSnapshot, STAGE_LABEL } from '@/lib/case/pipeline';
import { fmtMoney } from '@/lib/case/rules';
import type { Stage } from '@/lib/case/types';

/**
 * 发给 Agent 的有界上下文（范围快照）：项目、规则、当前阶段快照、线索与原件索引。
 * 每次新会话附带；面板内追问不再附带。
 */
export function buildContext(stage: Stage): string {
  const snap = getSnapshot(stage);
  const totals = (['A', 'B', 'C', 'D'] as const)
    .map((v) => {
      const s = snap.summaries[v];
      const t = s.taxedTotal != null ? `含税 ${fmtMoney(s.taxedTotal)}` : `未税 ${fmtMoney(s.untaxedTotal)}（税率未定，含税不可得）`;
      return `${s.shortName}方（${s.name}）：${t}；验算${s.verified ? '一致' : '异常'}`;
    })
    .join('\n');
  const short = { A: '甲', B: '乙', C: '丙', D: '丁' } as const;
  const priceMatrix = snap.rows
    .map(
      (r) =>
        `${r.code}（区间 ${r.range.low}–${r.range.high}）：` +
        (['A', 'B', 'C', 'D'] as const)
          .map((v) => {
            const p = r.cells[v].untaxedUnitPrice;
            return p != null ? `${short[v]} ${fmtMoney(p)}` : `${short[v]} —`;
          })
          .join('｜'),
    )
    .join('\n');
  const issues = snap.issues
    .filter((i) => i.status !== 'resolved')
    .map((i) => `- [${i.status === 'kept-open' ? '保留线索' : '待处理'}] ${i.title}：${i.detail}（依据：${i.basis}）`)
    .join('\n');
  const facts = FACT_FILES.map((f) => `- ${f.id} ${f.name}（${f.kind}，/${f.path}）：${f.desc}`).join('\n');

  return [
    '你是「山南勘测分包比选工作台」的商务助手，帮助商务部整理、核对、解释分包比选数据。',
    '',
    '【项目】GC-017 园区一批现场测量与检测工作分包比选；四家报价：甲方 Excel 含税 6%；乙方 PDF 未税单价（澄清后税率 6%）；丙方扫描件 含税 6%；丁方微信截图 含税 6%。统一清单 C01–C15。',
    `【当前台账阶段】${STAGE_LABEL[stage]}`,
    '',
    '【当前阶段四家合计】',
    totals,
    '',
    '【当前未决线索】',
    issues,
    '',
    '【统一清单未税单价矩阵（元，当前阶段口径；— 表示未知，不得当 0）】',
    priceMatrix,
    '',
    '【计算规则要点（必须遵守）】ROUND 两位；税率未给不得默认补写；未知值不可当 0；台班与项不可直接换算需书面说明；参考区间仅异常提示不改写价格；系统不推荐最低价中标，资质与价格合理性由商务部和评审组判断。',
    '',
    '【关键业务事实速查】',
    '- 乙 C08 未税 500 元/根 vs 参考区间 68–102，超上限约 4.9 倍；CLARIFY-01 确认不改价，线索保留待商务评审。',
    '- 丙 C04 原报 2,181.80 应为 2,161.80（120.10×18，多写 20 元）；丙 C13 机械进出场 3,392.00 元在附件页，已加计。',
    '- 丁 C04 原报 16 点应为 18 点；丁 C14 原 1 项 3,086.72 元，澄清确认含 4 台班，均分 771.68 元/台班（未税 728.00 落回区间 560–840）。',
    '- CHANGE-01：C08 由 60 根调整为 72 根，另存 V2 台账，保留 V1 基线；四家沿用已澄清单价。',
    '- 资质待补：乙检测资质未提交；丁检测资质 2026-08-31 到期未续。',
    '',
    '【原件索引（只读；引用时用 [F01](/facts/a-quote.xlsx) 形式链接，便于面板内预览）】',
    facts,
    '',
    '【回答要求】',
    '1. 用中文，简明、有数字、有出处（引用 F 编号与原件链接）；未知就说未知，不要猜数。',
    '2. 不推荐中标、不改写价格；异常只作为线索呈现。',
    '3. 若用户要求生成图表：在回答末尾追加一个闭合的 ```json 代码块，格式：',
    '   {"type":"dashboard-card","title":"标题","subtitle":"口径说明","chartType":"bar|column|list|donut|metric","data":[{"id":"a","label":"甲","value":1},...],"valuePrefix":"¥"}',
    '   数据必须来自上文事实，金额用数值（元）。该卡会自动插入左侧动态 Dashboard。',
    '4. 若用户明确要求执行台账推进（应用澄清/应用变更），在回答末尾追加闭合 ```json 代码块：',
    '   {"type":"set-stage","stage":"clarified"} 或 {"type":"set-stage","stage":"v2"}（raw=初始归集，clarified=澄清后，v2=变更V2）。',
  ].join('\n');
}
