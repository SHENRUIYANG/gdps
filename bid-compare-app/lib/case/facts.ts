import type { CaseEvent, FactFile, VendorId } from "./types";

/**
 * 事实库：原件清单（只读）、事件时间线、资格材料登记。
 * 原件存放于 public/facts/（数字化副本），原件与 AI 整理结果分开保存。
 */

export const FACT_FILES: FactFile[] = [
  { id: "F01", name: "甲方报价.xlsx", kind: "excel", vendor: "A", group: "quote", version: "A-V1", path: "facts/a-quote.xlsx", desc: "甲方检测服务商含税报价，15 项全，税率 6%，工作表「甲方含税报价」" },
  { id: "F02", name: "乙方报价.pdf", kind: "pdf", vendor: "B", group: "quote", version: "B-V1", path: "facts/b-quote.pdf", desc: "乙方 PDF 报价，只列未税单价，税率未写；C09 单价空白、C11 漏报、C07 重复、C08 超区间" },
  { id: "F03", name: "丙方扫描报价.pdf", kind: "pdf", vendor: "C", group: "quote", version: "C-V1", path: "facts/c-scan.pdf", desc: "丙方扫描报价单 2 页：第 1 页主报价（含税 6%），第 2 页机械进出场费用附件（3,392.00 元）" },
  { id: "F04", name: "报价扫描-1.png（丙主报价页原件）", kind: "image", vendor: "C", group: "quote", version: "C-V1", path: "facts/c-scan-1.png", desc: "丙方主报价页扫描原件，F03 第 1 页同源" },
  { id: "F05", name: "报价扫描-2.png（丙附件页原件）", kind: "image", vendor: "C", group: "quote", version: "C-V1", path: "facts/c-scan-2.png", desc: "丙方机械进出场费用说明附件扫描原件，F03 第 2 页同源" },
  { id: "F06", name: "丁方报价截图-1.png", kind: "image", vendor: "D", group: "quote", version: "D-V1", path: "facts/d-quote.png", desc: "丁方微信报价截图，含税 6%；C04 报 16 点，C14 测量设备按 1 项计价" },
  { id: "F07", name: "丁方费用说明聊天.png", kind: "chat", vendor: "D", group: "quote", version: "D-V1", path: "facts/d-chat.png", desc: "丁方微信费用说明：测量设备按 1 项报价、台班数待确认、机械进出场已单列" },
  { id: "F08", name: "标准比选清单与参考区间.xlsx", kind: "excel", group: "baseline", path: "facts/baseline.xlsx", desc: "统一 15 行清单（C01–C15）与未税单价参考区间，比较基准" },
  { id: "F09", name: "资格材料登记.xlsx", kind: "excel", group: "qualification", path: "facts/qualification.xlsx", desc: "四家营业执照摘要与检测资质摘要提交登记" },
  { id: "F10", name: "项目范围与计算规则.txt", kind: "text", group: "baseline", path: "facts/rules.txt", desc: "GC-017 计算口径：ROUND 两位、税率未给不得默认、未知不为 0、台班与项不可直接换算、参考区间仅提示、原件永不覆盖、修改留痕" },
  { id: "F11", name: "供应商澄清纪要.txt", kind: "text", group: "event", path: "facts/clarification.txt", desc: "CLARIFY-01（2026-09-19）：四家逐项确认——乙补 C09/C11、C07 去重、税率 6%；丙 C04 按乘积更正、C13 加计；丁 C04 改 18 点、C14 均分 4 台班" },
  { id: "F12", name: "项目变更通知.txt", kind: "text", group: "event", path: "facts/change.txt", desc: "CHANGE-01（2026-09-20）：C08 低应变检测 60 根→72 根，另存 V2 台账，保留 V1 基线" },
  { id: "F13", name: "比选输出模板.xlsx", kind: "excel", group: "output", path: "facts/template.xlsx", desc: "比选台账模板：对比表 / 需补充事项 / 操作记录 / 报价明细 / 资格材料清单五个工作表" },
];

export const FACT_BY_ID = Object.fromEntries(FACT_FILES.map((f) => [f.id, f])) as Record<string, FactFile>;

/**
 * 事件时间线。外部事件（报价送达、澄清、变更）与 AI 整理留痕同线呈现；
 * 修改明细 OpRecord 由 pipeline 按阶段动态生成，保证与计算结果一致。
 */
export const EVENTS: CaseEvent[] = [
  {
    id: "E1",
    time: "2026-09-18 09:00",
    type: "quote",
    title: "甲方报价送达（Excel · 含税）",
    actor: "甲方检测服务商",
    vendors: ["A"],
    factIds: ["F01"],
    detail: "按统一清单报价，机械进出场已在 C13 列明，税率 6%，15 项齐全。作为本轮比选的完整基线。",
  },
  {
    id: "E2",
    time: "2026-09-18 10:30",
    type: "quote",
    title: "乙方报价送达（PDF · 未税单价）",
    actor: "乙方检测服务商",
    vendors: ["B"],
    factIds: ["F02"],
    detail: "PDF 只列未税单价、未写税率。初步核读发现：C09 单价空白、C11 整行漏报、C07 重复出现两行、C08 未税 500 元/根明显偏高、合计与明细存在加总误差。",
    affects: ["C07", "C08", "C09", "C11"],
  },
  {
    id: "E3",
    time: "2026-09-18 14:00",
    type: "quote",
    title: "丙方扫描报价送达（扫描件 · 含税）",
    actor: "丙方检测服务商",
    vendors: ["C"],
    factIds: ["F03", "F04", "F05"],
    detail: "扫描件含税报价，税率 6%。机械进出场费用在附件页单列（含税 3,392.00 元），未计入主报价页服务合计；C04 分项金额与乘积不符（多写 20.00 元）。",
    affects: ["C04", "C13"],
  },
  {
    id: "E4",
    time: "2026-09-18 15:15",
    type: "quote",
    title: "丁方微信报价送达（截图 · 含税）",
    actor: "丁方服务商",
    vendors: ["D"],
    factIds: ["F06", "F07"],
    detail: "报价截图 + 聊天费用说明。C04 只报 16 点（标准清单 18 点）；C14 测量设备使用按「1 项」计价，聊天确认台班数待定——与标准清单「4 台班」口径不可直接换算。",
    affects: ["C04", "C14"],
  },
  {
    id: "E5",
    time: "2026-09-19 10:00",
    type: "clarify",
    title: "CLARIFY-01 供应商澄清纪要",
    actor: "商务人员整理 · 四家逐项确认",
    vendors: ["B", "C", "D"],
    factIds: ["F11"],
    detail:
      "乙：税率 6%；C11 补未税 62.00 元/组×10 组；C09 补未税 460.00 元/根×12 根；C07 只计一次；合计按明细重算；C08 未税 500 元/根维持报价不改，原因待商务评审。丙：C04 按乘积更正；附件进出场含税 3,392.00 元作为 C13 加计一次。丁：C14「1 项」包含 4 个台班，总价均分（771.68 元/台班）；C04 更正为 18 点，单价不变。乙尚未补检测资质；丁尚未提供资质续期材料。仅报价口径澄清，不表示评审通过。",
    affects: ["C04", "C07", "C09", "C11", "C13", "C14"],
  },
  {
    id: "E6",
    time: "2026-09-20 09:00",
    type: "change",
    title: "CHANGE-01 工程量变更通知",
    actor: "项目负责人",
    vendors: ["A", "B", "C", "D"],
    factIds: ["F12"],
    detail:
      "C08 低应变检测工程量由 60 根调整为 72 根，其他数量与范围不变；四家沿用各自已澄清的单价与税率。另存 V2 对比台账，保留 V1（60 根）价格基线、变更依据及金额差异。乙 C08 价格异常线索保留；乙、丁资格材料待补事项保持未关闭。",
    affects: ["C08"],
  },
];

/** 资格材料登记（F09 数字化副本） */
export interface QualificationRow {
  vendor: VendorId;
  category: string;
  submitted: boolean;
  docId?: string;
  note: string;
  status: "valid" | "missing" | "expiring";
}

export const QUALIFICATIONS: QualificationRow[] = [
  { vendor: "A", category: "营业执照摘要", submitted: true, docId: "MAT-A-001", note: "有效", status: "valid" },
  { vendor: "A", category: "检测资质摘要", submitted: true, docId: "MAT-A-002", note: "有效", status: "valid" },
  { vendor: "B", category: "营业执照摘要", submitted: true, docId: "MAT-B-001", note: "有效", status: "valid" },
  { vendor: "B", category: "检测资质摘要", submitted: false, note: "未提交 · 待补充（CLARIFY-01 确认尚未补）", status: "missing" },
  { vendor: "C", category: "营业执照摘要", submitted: true, docId: "MAT-C-001", note: "有效", status: "valid" },
  { vendor: "C", category: "检测资质摘要", submitted: true, docId: "MAT-C-002", note: "有效", status: "valid" },
  { vendor: "D", category: "营业执照摘要", submitted: true, docId: "MAT-D-001", note: "有效", status: "valid" },
  { vendor: "D", category: "检测资质摘要", submitted: true, docId: "MAT-D-002", note: "2026-08-31 到期；是否续期未提供", status: "expiring" },
];
