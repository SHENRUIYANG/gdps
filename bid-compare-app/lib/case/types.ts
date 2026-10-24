/**
 * GC-017 分包比选 · 领域类型
 *
 * 三层数据模型：
 * - 事实层（facts/vendors/boq）：原件、原始报价行、统一清单与参考区间，只读；
 * - 推导层（pipeline）：按《项目范围与计算规则》计算各阶段口径，永不改写事实；
 * - 呈现层：页面与 Agent 从 pipeline 的输出渲染。
 */

export type VendorId = "A" | "B" | "C" | "D";

export type BoqCode =
  | "C01" | "C02" | "C03" | "C04" | "C05" | "C06" | "C07" | "C08"
  | "C09" | "C10" | "C11" | "C12" | "C13" | "C14" | "C15";

/** 演示阶段：初始归集 → 澄清后 → 变更 V2 */
export type Stage = "raw" | "clarified" | "v2";

/** 报价口径：含税 / 未税 */
export type PriceBasis = "taxed" | "untaxed";

/** 统一清单条目 */
export interface BoqItem {
  code: BoqCode;
  name: string;
  unit: string;
  quantity: number;
  scope: string;
}

/** 未税单价参考区间（元），仅用于异常提示 */
export interface RefRange {
  code: BoqCode;
  low: number;
  high: number;
}

/** 来源定位：引用事实编号 + 可读位置 */
export interface SourceRef {
  factId: string;
  label: string;
}

/** 供应商原始报价行（照抄原件，不改写） */
export interface RawQuoteLine {
  id: string;
  vendor: VendorId;
  code: BoqCode;
  rawName: string;
  rawUnit: string;
  rawQty: number | null;
  rawUnitPrice: number | null;
  priceBasis: PriceBasis;
  taxRate: number | null;
  rawAmount: number | null;
  source: SourceRef;
  /** 重复行指向首次出现的行 */
  duplicateOf?: string;
  note?: string;
}

export interface VendorQuote {
  id: VendorId;
  name: string;
  shortName: string;
  format: string;
  basis: PriceBasis;
  taxRate: number | null;
  taxRateNote?: string;
  version: string;
  factId: string;
  /** 原报合计（仅当原件写明） */
  rawTotal: number | null;
  rawTotalNote?: string;
  lines: RawQuoteLine[];
}

/** 事实库文件 */
export interface FactFile {
  id: string;
  name: string;
  kind: "excel" | "pdf" | "image" | "chat" | "text";
  /** 供应商归属；基准资料无供应商 */
  vendor?: VendorId;
  group: "quote" | "baseline" | "qualification" | "event" | "output";
  version?: string;
  /** public/facts 下相对路径 */
  path: string;
  desc: string;
}

/** 修改留痕 */
export interface OpRecord {
  time: string;
  operator: string;
  vendor: VendorId;
  code: BoqCode | "TOTAL";
  field: string;
  oldValue: string;
  newValue: string;
  basis: string;
}

/** 时间线事件 */
export interface CaseEvent {
  id: string;
  time: string;
  type: "quote" | "clarify" | "change" | "ai-op";
  title: string;
  actor: string;
  vendors?: VendorId[];
  affects?: BoqCode[];
  factIds: string[];
  detail: string;
  ops?: OpRecord[];
}

/** 异常/待核查线索种类 */
export type IssueKind =
  | "missing-line"
  | "blank-price"
  | "duplicate"
  | "amount-mismatch"
  | "out-of-range"
  | "unit-mismatch"
  | "qty-mismatch"
  | "tax-missing"
  | "total-mismatch"
  | "separate-fee"
  | "qualification";

export interface Issue {
  id: string;
  vendor?: VendorId;
  code?: BoqCode;
  kind: IssueKind;
  severity: "error" | "warn" | "info";
  title: string;
  detail: string;
  basis: string;
  /** open=待处理；resolved=澄清已处理；kept-open=确认保留线索 */
  status: "open" | "resolved" | "kept-open";
  /** 该线索在哪些阶段可见 */
  stages: Stage[];
}

/** 规范化后的对比单元格 */
export interface CompareCell {
  vendor: VendorId;
  code: BoqCode;
  /** 未税金额（税率未知时为 null，不得默认） */
  untaxed: number | null;
  tax: number | null;
  taxed: number | null;
  /** 用于区间比对的未税单价 */
  untaxedUnitPrice: number | null;
  status: CellStatus;
  /** 折算依据（展示用） */
  basisText: string;
  source: SourceRef;
  lineId?: string;
}

export type CellStatus =
  | "ok"          // 正常可比
  | "missing"     // 整行漏报
  | "blank"       // 报了行但单价空白
  | "duplicate"   // 重复行（已计一次）
  | "amount-fixed"    // 金额不符，已按乘积更正
  | "out-of-range"    // 超出参考区间
  | "unit-converted"  // 单位不可比，已按书面说明折算
  | "qty-adjusted"    // 数量差异，已按标准清单调整
  | "separate-fee"    // 费用在附件单列，未计入主报价合计
  | "unconfirmed";    // 台班/项等待书面确认（raw 阶段）

export interface CompareRow {
  code: BoqCode;
  name: string;
  unit: string;
  quantity: number;
  /** v2 阶段的变更前数量 */
  prevQuantity?: number;
  range: RefRange;
  cells: Record<VendorId, CompareCell>;
  issues: string[];
}

export interface VendorSummary {
  vendor: VendorId;
  name: string;
  shortName: string;
  taxedTotal: number | null;
  untaxedTotal: number | null;
  verified: boolean;
  version: string;
  /** 合计口径说明（验算状态、重算依据等） */
  totalNote?: string;
}

export interface StageSnapshot {
  stage: Stage;
  rows: CompareRow[];
  summaries: Record<VendorId, VendorSummary>;
  issues: Issue[];
  ops: OpRecord[];
}
