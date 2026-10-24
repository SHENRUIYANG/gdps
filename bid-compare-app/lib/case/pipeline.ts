import { BOQ_ITEMS, REF_RANGES, V2_QTY_OVERRIDES } from "./boq";
import { VENDORS } from "./vendors";
import { compareRange, computeLineAmounts, fmtMoney, round2, type LineAmounts } from "./rules";
import type {
  BoqCode,
  CellStatus,
  CompareCell,
  CompareRow,
  Issue,
  IssueKind,
  OpRecord,
  PriceBasis,
  SourceRef,
  Stage,
  StageSnapshot,
  VendorId,
  VendorSummary,
} from "./types";

/**
 * 推导层：从事实层（vendors/boq）按《项目范围与计算规则》计算三个阶段的对比快照。
 * 所有金额都由 rules.ts 的固定公式推导，任何阶段都不改写事实层数据。
 */

const STAGE_ORDER: Record<Stage, number> = { raw: 0, clarified: 1, v2: 2 };
const atLeast = (stage: Stage, min: Stage) => STAGE_ORDER[stage] >= STAGE_ORDER[min];

const CLARIFY_TIME = "2026-09-19 10:00";
const CLARIFY_OPERATOR = "AI 整理 · 商务确认";
const CHANGE_TIME = "2026-09-20 09:00";
const CHANGE_OPERATOR = "项目负责人 · AI 整理";

/** 工作行：阶段变换后的可计算形态 */
interface WorkLine {
  lineId: string;
  vendor: VendorId;
  code: BoqCode;
  rawName: string;
  unit: string;
  qty: number | null;
  unitPrice: number | null;
  basis: PriceBasis;
  taxRate: number | null;
  /** 原报分项金额（可能与乘积不符） */
  reportedAmount: number | null;
  /** true=按乘积计算（更正/变更后）；false=沿用原报金额 */
  useProduct: boolean;
  /** 去重后是否计入 */
  counted: boolean;
  /** 澄清补录行 */
  addedByClarify: boolean;
  source: SourceRef;
  note?: string;
}

function buildWorkLines(stage: Stage): WorkLine[] {
  const lines: WorkLine[] = [];
  for (const v of VENDORS) {
    for (const l of v.lines) {
      lines.push({
        lineId: l.id,
        vendor: v.id,
        code: l.code,
        rawName: l.rawName,
        unit: l.rawUnit,
        qty: l.rawQty,
        unitPrice: l.rawUnitPrice,
        basis: l.priceBasis,
        taxRate: l.taxRate,
        reportedAmount: l.rawAmount,
        useProduct: false,
        counted: !l.duplicateOf,
        addedByClarify: false,
        source: l.source,
        note: l.note,
      });
    }
  }

  if (atLeast(stage, "clarified")) {
    for (const w of lines) {
      if (w.vendor === "B") w.taxRate = 0.06; // CLARIFY-01：税率 6%
      if (w.vendor === "C" && w.code === "C04") w.useProduct = true; // 按乘积更正
      if (w.vendor === "D" && w.code === "C04") {
        w.qty = 18; // 漏列 2 点补齐，单价不变
        w.useProduct = true; // 数量变化，金额按乘积重算
      }
      if (w.vendor === "D" && w.code === "C14") {
        // 「1 项」含 4 个台班，总价均分
        w.unit = "台班";
        w.qty = 4;
        w.unitPrice = round2(3086.72 / 4);
      }
    }
    const bC09 = lines.find((l) => l.lineId === "B-C09");
    if (bC09) bC09.unitPrice = 460.0; // 补未税单价 460.00 元/根
    lines.push({
      lineId: "B-C11-clarify",
      vendor: "B",
      code: "C11",
      rawName: "土工含水率试验（澄清补录）",
      unit: "组",
      qty: 10,
      unitPrice: 62.0,
      basis: "untaxed",
      taxRate: 0.06,
      reportedAmount: null,
      useProduct: true,
      counted: true,
      addedByClarify: true,
      source: { factId: "F11", label: "供应商澄清纪要.txt · 乙：C11 补未税单价 62.00 元/组、10 组" },
    });
  }

  if (atLeast(stage, "v2")) {
    for (const w of lines) {
      if (w.code === "C08" && w.qty != null) {
        w.qty = V2_QTY_OVERRIDES.C08!;
        w.useProduct = true; // 工程量变更，按新数量重算
      }
    }
  }
  return lines;
}

/** 按工作行计算该行在自身口径下的金额（原报金额优先，更正/变更行按乘积） */
function lineAmounts(w: WorkLine): LineAmounts {
  if (w.qty == null || w.unitPrice == null) return { untaxed: null, tax: null, taxed: null };
  const amt = !w.useProduct && w.reportedAmount != null ? w.reportedAmount : round2(w.qty * w.unitPrice);
  if (w.basis === "taxed") {
    const taxed = round2(amt);
    if (w.taxRate == null) return { untaxed: null, tax: null, taxed };
    const untaxed = round2(taxed / (1 + w.taxRate));
    return { untaxed, tax: round2(taxed - untaxed), taxed };
  }
  const untaxed = round2(amt);
  if (w.taxRate == null) return { untaxed, tax: null, taxed: null };
  const tax = round2(untaxed * w.taxRate);
  return { untaxed, tax, taxed: round2(untaxed + tax) };
}

function untaxedUnitPriceOf(w: WorkLine): number | null {
  if (w.unitPrice == null) return null;
  if (w.basis === "untaxed") return w.unitPrice;
  if (w.taxRate == null) return null;
  return round2(w.unitPrice / (1 + w.taxRate));
}

function basisTextOf(w: WorkLine, stage: Stage): string {
  if (w.qty == null || w.unitPrice == null) return "原件未报价";
  const parts: string[] = [];
  parts.push(
    w.basis === "taxed"
      ? `含税口径：${w.qty} ${w.unit} × ${fmtMoney(w.unitPrice)} 元/${w.unit}`
      : `未税口径：${w.qty} ${w.unit} × ${fmtMoney(w.unitPrice)} 元/${w.unit}`,
  );
  if (w.addedByClarify) parts.push("澄清补录（CLARIFY-01）");
  else if (w.lineId === "D-C14" && atLeast(stage, "clarified")) parts.push("按项均分：3,086.72 ÷ 4 台班 = 771.68 元/台班（CLARIFY-01）");
  else if (w.vendor === "C" && w.code === "C04" && atLeast(stage, "clarified")) parts.push("按乘积更正（CLARIFY-01）");
  else if (w.vendor === "D" && w.code === "C04" && atLeast(stage, "clarified")) parts.push("数量更正 16→18 点（CLARIFY-01）");
  else if (w.code === "C08" && atLeast(stage, "v2")) parts.push("工程量变更 60→72 根，按乘积重算（CHANGE-01）");
  return parts.join("；");
}

/** 线索定义：resolveAt 之前 open，之后 resolved / kept-open */
interface IssueDef {
  id: string;
  vendor?: VendorId;
  code?: BoqCode;
  kind: IssueKind;
  severity: Issue["severity"];
  title: string;
  detail: string;
  basis: string;
  resolveAt?: Stage;
  keptOpen?: boolean;
  qualification?: boolean;
}

const ISSUE_DEFS: IssueDef[] = [
  { id: "ISS-01", vendor: "B", kind: "tax-missing", severity: "warn", title: "乙：税率未写", detail: "PDF 只列未税单价、未写税率。按规则「未给税率不得默认补写」，含税总价暂不可得。", basis: "F10 规则第三条", resolveAt: "clarified" },
  { id: "ISS-02", vendor: "B", code: "C09", kind: "blank-price", severity: "error", title: "乙 C09：单价空白", detail: "声波透射检测报了行但单价栏空白，未知值不可当作 0。", basis: "F02 乙方报价.pdf 第1页", resolveAt: "clarified" },
  { id: "ISS-03", vendor: "B", code: "C11", kind: "missing-line", severity: "error", title: "乙 C11：整行漏报", detail: "土工含水率试验在乙方报价中整行缺失。", basis: "F02 与 F08 清单比对", resolveAt: "clarified" },
  { id: "ISS-04", vendor: "B", code: "C07", kind: "duplicate", severity: "warn", title: "乙 C07：重复两行", detail: "地表沉降监测在 PDF 中出现两行，同价同量，只能计一次。", basis: "F02 乙方报价.pdf 第1页", resolveAt: "clarified" },
  { id: "ISS-05", vendor: "B", kind: "total-mismatch", severity: "error", title: "乙：合计与明细不符", detail: "原报合计存在加总误差，须按确认后的明细重算。", basis: "F11 CLARIFY-01", resolveAt: "clarified" },
  { id: "ISS-06", vendor: "B", code: "C08", kind: "out-of-range", severity: "warn", title: "乙 C08：未税 500 元/根超参考区间", detail: "参考区间 68–102 元/根（未税），乙报价 500 元/根约为上限 4.9 倍。CLARIFY-01 确认维持报价不修改，异常线索保留待商务评审——参考区间仅提示，不改写价格。", basis: "F08 参考价格区间 · F10 规则第五条 · F11 CLARIFY-01", resolveAt: "clarified", keptOpen: true },
  { id: "ISS-07", vendor: "C", code: "C04", kind: "amount-mismatch", severity: "error", title: "丙 C04：分项金额抄错", detail: "单价 120.10 × 18 点 = 2,161.80 元，原件写 2,181.80 元，多写 20.00 元。", basis: "F03 第1页 · F11 CLARIFY-01", resolveAt: "clarified" },
  { id: "ISS-08", vendor: "C", code: "C13", kind: "separate-fee", severity: "warn", title: "丙 C13：进出场费附件单列", detail: "机械进出场含税 3,392.00 元在附件页单列，未计入主报价页服务合计（38,505.84 元），对齐时应作为 C13 加计一次。", basis: "F03 第2页 · F11 CLARIFY-01", resolveAt: "clarified" },
  { id: "ISS-09", vendor: "D", code: "C04", kind: "qty-mismatch", severity: "warn", title: "丁 C04：数量 16≠18", detail: "标准清单 18 点，丁只报 16 点（漏列 2 点）。", basis: "F06 丁方报价截图 · F08 清单", resolveAt: "clarified" },
  { id: "ISS-10", vendor: "D", code: "C14", kind: "unit-mismatch", severity: "warn", title: "丁 C14：按「项」计价，与「台班」不可直接换算", detail: "测量设备使用按 1 项 3,086.72 元报价；台班与项不能直接换算，必须有供应商书面说明。聊天记录确认台班数待定；CLARIFY-01 书面确认该项包含 4 个台班，可均分 771.68 元/台班。", basis: "F06 · F07 聊天记录 · F10 规则第四条 · F11 CLARIFY-01", resolveAt: "clarified" },
  { id: "ISS-11", vendor: "B", kind: "qualification", severity: "error", title: "乙：检测资质摘要未提交", detail: "资格材料登记显示检测资质摘要未提交，待补充。仅报价口径澄清，不表示评审通过。", basis: "F09 资格材料登记 · F11 CLARIFY-01", qualification: true },
  { id: "ISS-12", vendor: "D", kind: "qualification", severity: "warn", title: "丁：检测资质 2026-08-31 到期，续期未提供", detail: "检测资质摘要已提交但 2026-08-31 到期，是否续期未提供；CHANGE-01 确认待补事项保持未关闭。", basis: "F09 资格材料登记 · F12 CHANGE-01", qualification: true },
];

function buildIssues(stage: Stage): Issue[] {
  return ISSUE_DEFS.map((def) => {
    let status: Issue["status"] = "open";
    if (def.resolveAt && atLeast(stage, def.resolveAt)) {
      status = def.keptOpen ? "kept-open" : "resolved";
    }
    return {
      id: def.id,
      vendor: def.vendor,
      code: def.code,
      kind: def.kind,
      severity: def.severity,
      title: def.title,
      detail: def.detail,
      basis: def.basis,
      status,
      stages: ["raw", "clarified", "v2"] as Stage[],
    };
  });
}

function cellStatus(w: WorkLine | undefined, stage: Stage, untaxedPrice: number | null): CellStatus {
  if (!w) return "missing";
  if (w.unitPrice == null) return "blank";
  if (w.vendor === "B" && w.code === "C07") return "duplicate";
  if (w.vendor === "D" && w.code === "C14") return atLeast(stage, "clarified") ? "unit-converted" : "unconfirmed";
  if (w.vendor === "C" && w.code === "C13" && !atLeast(stage, "clarified")) return "separate-fee";
  if (w.vendor === "C" && w.code === "C04") return atLeast(stage, "clarified") ? "amount-fixed" : "ok";
  if (w.vendor === "D" && w.code === "C04") return atLeast(stage, "clarified") ? "qty-adjusted" : "ok";
  const range = REF_RANGES[w.code];
  if (untaxedPrice != null && range && compareRange(untaxedPrice, range.low, range.high) !== 0) return "out-of-range";
  return "ok";
}

function buildCore(stage: Stage): StageSnapshot {
  const work = buildWorkLines(stage);
  const issues = buildIssues(stage);
  const issueIds = new Set(issues.filter((i) => i.status !== "resolved").map((i) => i.id));

  const rows: CompareRow[] = BOQ_ITEMS.map((item) => {
    const cells = {} as Record<VendorId, CompareCell>;
    for (const v of VENDORS) {
      const w = work.find((l) => l.vendor === v.id && l.code === item.code && l.counted);
      const amounts = w ? lineAmounts(w) : { untaxed: null, tax: null, taxed: null };
      const untaxedPrice = w ? untaxedUnitPriceOf(w) : null;
      cells[v.id] = {
        vendor: v.id,
        code: item.code,
        untaxed: amounts.untaxed,
        tax: amounts.tax,
        taxed: amounts.taxed,
        untaxedUnitPrice: untaxedPrice,
        status: w ? cellStatus(w, stage, untaxedPrice) : "missing",
        basisText: w ? basisTextOf(w, stage) : "该供应商未报价（漏报）",
        source: w ? w.source : { factId: "F02", label: "乙方报价.pdf · 全表无此行" },
        lineId: w?.lineId,
      };
    }
    const rowIssues = issues
      .filter((i) => i.code === item.code && issueIds.has(i.id))
      .map((i) => i.id);
    return {
      code: item.code,
      name: item.name,
      unit: item.unit,
      quantity: stage === "v2" ? V2_QTY_OVERRIDES[item.code] ?? item.quantity : item.quantity,
      prevQuantity: stage === "v2" && item.code === "C08" ? 60 : undefined,
      range: REF_RANGES[item.code],
      cells,
      issues: rowIssues,
    };
  });

  const summaries = {} as Record<VendorId, VendorSummary>;
  for (const v of VENDORS) {
    const own = work.filter((l) => l.vendor === v.id && l.counted);
    const withAmounts = own.map((w) => lineAmounts(w));
    const hasAllTaxed = withAmounts.every((a) => a.taxed != null);
    const untaxedTotal = round2(withAmounts.reduce((s, a) => s + (a.untaxed ?? 0), 0));
    const taxedTotal = hasAllTaxed ? round2(withAmounts.reduce((s, a) => s + (a.taxed ?? 0), 0)) : null;
    let verified = true;
    let totalNote: string | undefined;
    if (v.id === "B" && !atLeast(stage, "clarified")) {
      verified = false;
      totalNote = "原报合计与明细不符（加总误差）；税率未定，含税总价不可得";
    } else if (v.id === "B") {
      totalNote = "按澄清后明细重算";
    } else if (v.id === "C" && !atLeast(stage, "clarified")) {
      totalNote = "主表明细加总一致（38,505.84 ✓）；对齐合计含附件 C13 加计 3,392.00 与 C04 差错 20.00";
    } else if (v.id === "C") {
      totalNote = "含 C04 更正与 C13 加计（CLARIFY-01）";
    } else if (stage === "v2") {
      totalNote = "V2：C08 按 72 根重算（CHANGE-01）";
    }
    summaries[v.id] = {
      vendor: v.id,
      name: v.name,
      shortName: v.shortName,
      taxedTotal,
      untaxedTotal,
      verified,
      version: stage === "v2" ? `${v.version.replace("V1", "V2")}（C08=72根）` : v.version,
      totalNote,
    };
  }

  return { stage, rows, summaries, issues, ops: [] };
}

/** 修改留痕：从各阶段计算结果动态生成，保证与表格数字一致 */
function buildClarifyOps(): OpRecord[] {
  const c = memo.clarified.summaries;
  return [
    { time: CLARIFY_TIME, operator: CLARIFY_OPERATOR, vendor: "B", code: "TOTAL", field: "报价税率", oldValue: "未写", newValue: "6%", basis: "CLARIFY-01：乙税率 6%" },
    { time: CLARIFY_TIME, operator: CLARIFY_OPERATOR, vendor: "B", code: "C09", field: "未税单价", oldValue: "空白", newValue: "460.00 元/根 × 12 根", basis: "CLARIFY-01：乙补未税单价 460.00 元/根、12 根" },
    { time: CLARIFY_TIME, operator: CLARIFY_OPERATOR, vendor: "B", code: "C11", field: "分项行", oldValue: "整行漏报", newValue: "补录 未税 62.00 元/组 × 10 组", basis: "CLARIFY-01：乙补未税单价 62.00 元/组、10 组" },
    { time: CLARIFY_TIME, operator: CLARIFY_OPERATOR, vendor: "B", code: "C07", field: "计次", oldValue: "重复 2 行", newValue: "只计 1 次（1,568.00 元）", basis: "CLARIFY-01：C07 两行属重复，请只计一次" },
    { time: CLARIFY_TIME, operator: CLARIFY_OPERATOR, vendor: "B", code: "TOTAL", field: "合计", oldValue: "原报合计（加总误差）", newValue: `按明细重算 未税 ${fmtMoney(c.B.untaxedTotal)} 元`, basis: "CLARIFY-01：请据确认后明细重算" },
    { time: CLARIFY_TIME, operator: CLARIFY_OPERATOR, vendor: "C", code: "C04", field: "含税金额", oldValue: "2,181.80 元", newValue: "2,161.80 元", basis: "CLARIFY-01：单价与数量正确，金额抄错多写 20.00 元，按乘积更正" },
    { time: CLARIFY_TIME, operator: CLARIFY_OPERATOR, vendor: "C", code: "C13", field: "附件费用", oldValue: "附件单列，未计入主表合计", newValue: "作为 C13 加计 含税 3,392.00 元", basis: "CLARIFY-01：附件进出场含税 3,392.00 元应作为 C13 加计一次" },
    { time: CLARIFY_TIME, operator: CLARIFY_OPERATOR, vendor: "C", code: "TOTAL", field: "含税合计", oldValue: "38,505.84 元（主表）", newValue: `${fmtMoney(c.C.taxedTotal)} 元（含 C04 更正与 C13 加计）`, basis: "CLARIFY-01" },
    { time: CLARIFY_TIME, operator: CLARIFY_OPERATOR, vendor: "D", code: "C04", field: "数量与金额", oldValue: "16 点 / 1,940.16 元", newValue: "18 点 / 2,182.68 元", basis: "CLARIFY-01：原写 16 点漏列 2 点，应为 18 点，单价不变，金额重算" },
    { time: CLARIFY_TIME, operator: CLARIFY_OPERATOR, vendor: "D", code: "C14", field: "计价单位与单价", oldValue: "1 项 / 3,086.72 元/项", newValue: "4 台班 / 771.68 元/台班（总价均分）", basis: "CLARIFY-01：C14「1项」包含本项目 4 个台班，总价均分到 4 台班，不另加费用" },
    { time: CLARIFY_TIME, operator: CLARIFY_OPERATOR, vendor: "D", code: "TOTAL", field: "含税合计", oldValue: "41,924.08 元", newValue: `${fmtMoney(c.D.taxedTotal)} 元`, basis: "CLARIFY-01" },
  ];
}

function buildChangeOps(): OpRecord[] {
  const c = memo.clarified.summaries;
  const v = memo.v2.summaries;
  return [
    { time: CHANGE_TIME, operator: CHANGE_OPERATOR, vendor: "A", code: "C08", field: "数量与金额", oldValue: "60 根 / 5,406.00 元", newValue: "72 根 / 6,487.20 元", basis: "CHANGE-01：C08 由 60 根调整为 72 根" },
    { time: CHANGE_TIME, operator: CHANGE_OPERATOR, vendor: "B", code: "C08", field: "数量与金额", oldValue: "60 根 / 30,000.00 元（未税）", newValue: "72 根 / 36,000.00 元（未税）", basis: "CHANGE-01" },
    { time: CHANGE_TIME, operator: CHANGE_OPERATOR, vendor: "C", code: "C08", field: "数量与金额", oldValue: "60 根 / 5,568.00 元", newValue: "72 根 / 6,681.60 元", basis: "CHANGE-01" },
    { time: CHANGE_TIME, operator: CHANGE_OPERATOR, vendor: "D", code: "C08", field: "数量与金额", oldValue: "60 根 / 5,622.00 元", newValue: "72 根 / 6,746.40 元", basis: "CHANGE-01" },
    { time: CHANGE_TIME, operator: CHANGE_OPERATOR, vendor: "A", code: "TOTAL", field: "台账版本与含税合计", oldValue: `V1 / ${fmtMoney(c.A.taxedTotal)} 元`, newValue: `V2 / ${fmtMoney(v.A.taxedTotal)} 元`, basis: "CHANGE-01：另存 V2，保留 V1 基线" },
    { time: CHANGE_TIME, operator: CHANGE_OPERATOR, vendor: "B", code: "TOTAL", field: "台账版本与未税合计", oldValue: `V1 / ${fmtMoney(c.B.untaxedTotal)} 元`, newValue: `V2 / ${fmtMoney(v.B.untaxedTotal)} 元`, basis: "CHANGE-01" },
    { time: CHANGE_TIME, operator: CHANGE_OPERATOR, vendor: "C", code: "TOTAL", field: "台账版本与含税合计", oldValue: `V1 / ${fmtMoney(c.C.taxedTotal)} 元`, newValue: `V2 / ${fmtMoney(v.C.taxedTotal)} 元`, basis: "CHANGE-01" },
    { time: CHANGE_TIME, operator: CHANGE_OPERATOR, vendor: "D", code: "TOTAL", field: "台账版本与含税合计", oldValue: `V1 / ${fmtMoney(c.D.taxedTotal)} 元`, newValue: `V2 / ${fmtMoney(v.D.taxedTotal)} 元`, basis: "CHANGE-01" },
  ];
}

/** 三阶段快照（纯计算，模块级缓存；ops 引用快照结果，初始化后回填） */
const memo: Record<Stage, StageSnapshot> = {
  raw: buildCore("raw"),
  clarified: buildCore("clarified"),
  v2: buildCore("v2"),
};
memo.clarified.ops = buildClarifyOps();
memo.v2.ops = [...memo.clarified.ops, ...buildChangeOps()];

export function getSnapshot(stage: Stage): StageSnapshot {
  return memo[stage];
}

export const ALL_STAGES: Stage[] = ["raw", "clarified", "v2"];

/** 阶段推进的演示文案 */
export const STAGE_LABEL: Record<Stage, string> = {
  raw: "初始归集（09-18 四家报价）",
  clarified: "澄清后（09-19 CLARIFY-01）",
  v2: "变更 V2（09-20 CHANGE-01 · C08=72根）",
};

export const STAGE_SHORT: Record<Stage, string> = {
  raw: "初始归集",
  clarified: "澄清后",
  v2: "变更 V2",
};
