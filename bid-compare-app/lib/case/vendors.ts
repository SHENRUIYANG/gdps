import type { RawQuoteLine, VendorQuote } from "./types";

/**
 * 四家原始报价 · 事实层（照抄原件，含各家原始名称/单位/口径，永不改写）。
 * 数字化副本已经与原件及 CLARIFY-01 澄清纪要交叉验证一致。
 */

const A = (row: number, label: string) => ({ factId: "F01", label: `甲方报价.xlsx ·「甲方含税报价」第${row}行 · ${label}` });
const B = (label: string) => ({ factId: "F02", label: `乙方报价.pdf · 第1页 · ${label}` });
const C = (page: 1 | 2, label: string) => ({ factId: "F03", label: `丙方扫描报价.pdf · 第${page}页 · ${label}` });
const D = (label: string) => ({ factId: "F06", label: `丁方报价截图-1.png · ${label}` });

/** 甲方：Excel，含税单价，税率 6%，15 项全，干净基线 */
const vendorA: VendorQuote = {
  id: "A",
  name: "甲方检测服务商",
  shortName: "甲",
  format: "Excel",
  basis: "taxed",
  taxRate: 0.06,
  version: "A-V1 / 2026-09-18",
  factId: "F01",
  rawTotal: 40545.0,
  lines: [
    { id: "A-C01", vendor: "A", code: "C01", rawName: "控制点复核", rawUnit: "点", rawQty: 12, rawUnitPrice: 190.8, priceBasis: "taxed", taxRate: 0.06, rawAmount: 2289.6, source: A(2, "C01 控制点复核") },
    { id: "A-C02", vendor: "A", code: "C02", rawName: "地形测绘", rawUnit: "亩", rawQty: 20, rawUnitPrice: 233.2, priceBasis: "taxed", taxRate: 0.06, rawAmount: 4664.0, source: A(3, "C02 地形测绘") },
    { id: "A-C03", vendor: "A", code: "C03", rawName: "建筑物沉降监测", rawUnit: "点", rawQty: 24, rawUnitPrice: 95.4, priceBasis: "taxed", taxRate: 0.06, rawAmount: 2289.6, source: A(4, "C03 建筑物沉降监测") },
    { id: "A-C04", vendor: "A", code: "C04", rawName: "基坑水平位移监测", rawUnit: "点", rawQty: 18, rawUnitPrice: 116.6, priceBasis: "taxed", taxRate: 0.06, rawAmount: 2098.8, source: A(5, "C04 基坑水平位移监测") },
    { id: "A-C05", vendor: "A", code: "C05", rawName: "基坑竖向位移监测", rawUnit: "点", rawQty: 18, rawUnitPrice: 106.0, priceBasis: "taxed", taxRate: 0.06, rawAmount: 1908.0, source: A(6, "C05 基坑竖向位移监测") },
    { id: "A-C06", vendor: "A", code: "C06", rawName: "地下水位观测", rawUnit: "孔", rawQty: 6, rawUnitPrice: 159.0, priceBasis: "taxed", taxRate: 0.06, rawAmount: 954.0, source: A(7, "C06 地下水位观测") },
    { id: "A-C07", vendor: "A", code: "C07", rawName: "地表沉降监测", rawUnit: "点", rawQty: 20, rawUnitPrice: 84.8, priceBasis: "taxed", taxRate: 0.06, rawAmount: 1696.0, source: A(8, "C07 地表沉降监测") },
    { id: "A-C08", vendor: "A", code: "C08", rawName: "低应变检测", rawUnit: "根", rawQty: 60, rawUnitPrice: 90.1, priceBasis: "taxed", taxRate: 0.06, rawAmount: 5406.0, source: A(9, "C08 低应变检测") },
    { id: "A-C09", vendor: "A", code: "C09", rawName: "声波透射检测", rawUnit: "根", rawQty: 12, rawUnitPrice: 477.0, priceBasis: "taxed", taxRate: 0.06, rawAmount: 5724.0, source: A(10, "C09 声波透射检测") },
    { id: "A-C10", vendor: "A", code: "C10", rawName: "混凝土回弹检测", rawUnit: "构件", rawQty: 30, rawUnitPrice: 127.2, priceBasis: "taxed", taxRate: 0.06, rawAmount: 3816.0, source: A(11, "C10 混凝土回弹检测") },
    { id: "A-C11", vendor: "A", code: "C11", rawName: "土工含水率试验", rawUnit: "组", rawQty: 10, rawUnitPrice: 63.6, priceBasis: "taxed", taxRate: 0.06, rawAmount: 636.0, source: A(12, "C11 土工含水率试验") },
    { id: "A-C12", vendor: "A", code: "C12", rawName: "土工密度试验", rawUnit: "组", rawQty: 10, rawUnitPrice: 100.7, priceBasis: "taxed", taxRate: 0.06, rawAmount: 1007.0, source: A(13, "C12 土工密度试验") },
    { id: "A-C13", vendor: "A", code: "C13", rawName: "机械进出场", rawUnit: "项", rawQty: 1, rawUnitPrice: 3180.0, priceBasis: "taxed", taxRate: 0.06, rawAmount: 3180.0, source: A(14, "C13 机械进出场") },
    { id: "A-C14", vendor: "A", code: "C14", rawName: "测量设备使用", rawUnit: "台班", rawQty: 4, rawUnitPrice: 742.0, priceBasis: "taxed", taxRate: 0.06, rawAmount: 2968.0, source: A(15, "C14 测量设备使用") },
    { id: "A-C15", vendor: "A", code: "C15", rawName: "成果整理与报告", rawUnit: "项", rawQty: 1, rawUnitPrice: 1908.0, priceBasis: "taxed", taxRate: 0.06, rawAmount: 1908.0, source: A(16, "C15 成果整理与报告") },
  ],
};

/** 乙方：PDF，只列未税单价，税率未写（澄清后 6%）；C09 单价空白、C11 整行漏报、C07 重复两行、C08 超区间、合计加总误差 */
const vendorB: VendorQuote = {
  id: "B",
  name: "乙方检测服务商",
  shortName: "乙",
  format: "PDF",
  basis: "untaxed",
  taxRate: null,
  taxRateNote: "原件未写税率；CLARIFY-01 澄清为 6%（未给税率不得默认补写）",
  version: "B-V1 / 2026-09-18",
  factId: "F02",
  rawTotal: null,
  rawTotalNote: "原报合计与分项明细存在加总误差；CLARIFY-01 要求按确认后明细重算",
  lines: [
    { id: "B-C01", vendor: "B", code: "C01", rawName: "控制点复核", rawUnit: "点", rawQty: 12, rawUnitPrice: 176.4, priceBasis: "untaxed", taxRate: null, rawAmount: 2116.8, source: B("C01 控制点复核") },
    { id: "B-C02", vendor: "B", code: "C02", rawName: "地形测绘", rawUnit: "亩", rawQty: 20, rawUnitPrice: 215.6, priceBasis: "untaxed", taxRate: null, rawAmount: 4312.0, source: B("C02 地形测绘") },
    { id: "B-C03", vendor: "B", code: "C03", rawName: "沉降点观测（建筑物）", rawUnit: "点", rawQty: 24, rawUnitPrice: 88.2, priceBasis: "untaxed", taxRate: null, rawAmount: 2116.8, source: B("C03 沉降点观测（建筑物）") },
    { id: "B-C04", vendor: "B", code: "C04", rawName: "基坑水平位移监测", rawUnit: "点", rawQty: 18, rawUnitPrice: 107.8, priceBasis: "untaxed", taxRate: null, rawAmount: 1940.4, source: B("C04 基坑水平位移监测") },
    { id: "B-C05", vendor: "B", code: "C05", rawName: "基坑竖向位移监测", rawUnit: "点", rawQty: 18, rawUnitPrice: 98.0, priceBasis: "untaxed", taxRate: null, rawAmount: 1764.0, source: B("C05 基坑竖向位移监测") },
    { id: "B-C06", vendor: "B", code: "C06", rawName: "地下水位观测", rawUnit: "孔", rawQty: 6, rawUnitPrice: 147.0, priceBasis: "untaxed", taxRate: null, rawAmount: 882.0, source: B("C06 地下水位观测") },
    { id: "B-C07-r1", vendor: "B", code: "C07", rawName: "地表沉降监测", rawUnit: "点", rawQty: 20, rawUnitPrice: 78.4, priceBasis: "untaxed", taxRate: null, rawAmount: 1568.0, source: B("C07 地表沉降监测（第1次出现）") },
    { id: "B-C07-r2", vendor: "B", code: "C07", rawName: "地表沉降监测", rawUnit: "点", rawQty: 20, rawUnitPrice: 78.4, priceBasis: "untaxed", taxRate: null, rawAmount: 1568.0, source: B("C07 地表沉降监测（第2次出现，重复行）"), duplicateOf: "B-C07-r1", note: "CLARIFY-01：两行属重复，只计一次" },
    { id: "B-C08", vendor: "B", code: "C08", rawName: "低应变检测", rawUnit: "根", rawQty: 60, rawUnitPrice: 500.0, priceBasis: "untaxed", taxRate: null, rawAmount: 30000.0, source: B("C08 低应变检测"), note: "未税 500.00 元/根，超出参考区间上限 102 元约 4.9 倍；CLARIFY-01 确认不改价，线索保留" },
    { id: "B-C09", vendor: "B", code: "C09", rawName: "声波透射检测", rawUnit: "根", rawQty: 12, rawUnitPrice: null, priceBasis: "untaxed", taxRate: null, rawAmount: null, source: B("C09 声波透射检测（单价空白）"), note: "原件单价栏空白；CLARIFY-01 补未税 460.00 元/根 × 12 根" },
    { id: "B-C10", vendor: "B", code: "C10", rawName: "混凝土回弹检测", rawUnit: "构件", rawQty: 30, rawUnitPrice: 117.6, priceBasis: "untaxed", taxRate: null, rawAmount: 3528.0, source: B("C10 混凝土回弹检测") },
    { id: "B-C12", vendor: "B", code: "C12", rawName: "土工密度试验", rawUnit: "组", rawQty: 10, rawUnitPrice: 93.1, priceBasis: "untaxed", taxRate: null, rawAmount: 931.0, source: B("C12 土工密度试验") },
    { id: "B-C13", vendor: "B", code: "C13", rawName: "机械进出场", rawUnit: "项", rawQty: 1, rawUnitPrice: 2940.0, priceBasis: "untaxed", taxRate: null, rawAmount: 2940.0, source: B("C13 机械进出场") },
    { id: "B-C14", vendor: "B", code: "C14", rawName: "测量设备使用", rawUnit: "台班", rawQty: 4, rawUnitPrice: 686.0, priceBasis: "untaxed", taxRate: null, rawAmount: 2744.0, source: B("C14 测量设备使用") },
    { id: "B-C15", vendor: "B", code: "C15", rawName: "成果整理与报告", rawUnit: "项", rawQty: 1, rawUnitPrice: 1764.0, priceBasis: "untaxed", taxRate: null, rawAmount: 1764.0, source: B("C15 成果整理与报告") },
    // C11 土工含水率试验：整行漏报，CLARIFY-01 补未税 62.00 元/组 × 10 组（在 pipeline 澄清阶段注入）
  ],
};

/** 丙方：扫描报价单（图片型），含税 6%；C04 分项金额抄错 +20.00；C13 进出场在附件页未计入主表 */
const vendorC: VendorQuote = {
  id: "C",
  name: "丙方检测服务商",
  shortName: "丙",
  format: "扫描件",
  basis: "taxed",
  taxRate: 0.06,
  version: "C-V1 / 2026-09-18",
  factId: "F03",
  rawTotal: 38505.84,
  rawTotalNote: "主报价页服务合计；未含附件页机械进出场 3,392.00 元（CLARIFY-01 要求作为 C13 加计一次）",
  lines: [
    { id: "C-C01", vendor: "C", code: "C01", rawName: "控制点复核", rawUnit: "点", rawQty: 12, rawUnitPrice: 196.52, priceBasis: "taxed", taxRate: 0.06, rawAmount: 2358.24, source: C(1, "C01 控制点复核") },
    { id: "C-C02", vendor: "C", code: "C02", rawName: "地形测绘", rawUnit: "亩", rawQty: 20, rawUnitPrice: 240.2, priceBasis: "taxed", taxRate: 0.06, rawAmount: 4804.0, source: C(1, "C02 地形测绘") },
    { id: "C-C03", vendor: "C", code: "C03", rawName: "建筑物沉降监测", rawUnit: "点", rawQty: 24, rawUnitPrice: 98.26, priceBasis: "taxed", taxRate: 0.06, rawAmount: 2358.24, source: C(1, "C03 建筑物沉降监测") },
    { id: "C-C04", vendor: "C", code: "C04", rawName: "基坑水平位移监测", rawUnit: "点", rawQty: 18, rawUnitPrice: 120.1, priceBasis: "taxed", taxRate: 0.06, rawAmount: 2181.8, source: C(1, "C04 基坑水平位移监测"), note: "分项金额抄错多写 20.00 元；按乘积应为 2,161.80（CLARIFY-01 按乘积更正）" },
    { id: "C-C05", vendor: "C", code: "C05", rawName: "基坑竖向位移监测", rawUnit: "点", rawQty: 18, rawUnitPrice: 109.18, priceBasis: "taxed", taxRate: 0.06, rawAmount: 1965.24, source: C(1, "C05 基坑竖向位移监测") },
    { id: "C-C06", vendor: "C", code: "C06", rawName: "地下水位观测", rawUnit: "孔", rawQty: 6, rawUnitPrice: 163.77, priceBasis: "taxed", taxRate: 0.06, rawAmount: 982.62, source: C(1, "C06 地下水位观测") },
    { id: "C-C07", vendor: "C", code: "C07", rawName: "地表沉降监测", rawUnit: "点", rawQty: 20, rawUnitPrice: 87.34, priceBasis: "taxed", taxRate: 0.06, rawAmount: 1746.8, source: C(1, "C07 地表沉降监测") },
    { id: "C-C08", vendor: "C", code: "C08", rawName: "低应变检测", rawUnit: "根", rawQty: 60, rawUnitPrice: 92.8, priceBasis: "taxed", taxRate: 0.06, rawAmount: 5568.0, source: C(1, "C08 低应变检测") },
    { id: "C-C09", vendor: "C", code: "C09", rawName: "声波透射检测", rawUnit: "根", rawQty: 12, rawUnitPrice: 491.31, priceBasis: "taxed", taxRate: 0.06, rawAmount: 5895.72, source: C(1, "C09 声波透射检测") },
    { id: "C-C10", vendor: "C", code: "C10", rawName: "混凝土回弹检测", rawUnit: "构件", rawQty: 30, rawUnitPrice: 131.02, priceBasis: "taxed", taxRate: 0.06, rawAmount: 3930.6, source: C(1, "C10 混凝土回弹检测") },
    { id: "C-C11", vendor: "C", code: "C11", rawName: "土工含水率试验", rawUnit: "组", rawQty: 10, rawUnitPrice: 65.51, priceBasis: "taxed", taxRate: 0.06, rawAmount: 655.1, source: C(1, "C11 土工含水率试验") },
    { id: "C-C12", vendor: "C", code: "C12", rawName: "土工密度试验", rawUnit: "组", rawQty: 10, rawUnitPrice: 103.72, priceBasis: "taxed", taxRate: 0.06, rawAmount: 1037.2, source: C(1, "C12 土工密度试验") },
    { id: "C-C13", vendor: "C", code: "C13", rawName: "机械进出场（附件另列）", rawUnit: "项", rawQty: 1, rawUnitPrice: 3392.0, priceBasis: "taxed", taxRate: 0.06, rawAmount: 3392.0, source: C(2, "附件：机械进出场费用说明"), note: "含税 3,392.00 元在附件页单列，未计入主报价页服务合计；CLARIFY-01 要求作为 C13 加计一次" },
    { id: "C-C14", vendor: "C", code: "C14", rawName: "测量设备使用", rawUnit: "台班", rawQty: 4, rawUnitPrice: 764.26, priceBasis: "taxed", taxRate: 0.06, rawAmount: 3057.04, source: C(1, "C14 测量设备使用") },
    { id: "C-C15", vendor: "C", code: "C15", rawName: "成果整理与报告", rawUnit: "项", rawQty: 1, rawUnitPrice: 1965.24, priceBasis: "taxed", taxRate: 0.06, rawAmount: 1965.24, source: C(1, "C15 成果整理与报告") },
  ],
};

/** 丁方：微信截图报价，含税 6%；C04 数量 16≠18；C14 按项计价（1项含4台班，待澄清均分） */
const vendorD: VendorQuote = {
  id: "D",
  name: "丁方服务商",
  shortName: "丁",
  format: "微信截图",
  basis: "taxed",
  taxRate: 0.06,
  version: "D-V1 / 2026-09-18 15:10",
  factId: "F06",
  rawTotal: 41924.08,
  lines: [
    { id: "D-C01", vendor: "D", code: "C01", rawName: "控制点复核", rawUnit: "点", rawQty: 12, rawUnitPrice: 198.43, priceBasis: "taxed", taxRate: 0.06, rawAmount: 2381.16, source: D("C01 控制点复核") },
    { id: "D-C02", vendor: "D", code: "C02", rawName: "地形测绘", rawUnit: "亩", rawQty: 20, rawUnitPrice: 242.53, priceBasis: "taxed", taxRate: 0.06, rawAmount: 4850.6, source: D("C02 地形测绘") },
    { id: "D-C03", vendor: "D", code: "C03", rawName: "建筑物沉降监测", rawUnit: "点", rawQty: 24, rawUnitPrice: 99.22, priceBasis: "taxed", taxRate: 0.06, rawAmount: 2381.28, source: D("C03 建筑物沉降监测") },
    { id: "D-C04", vendor: "D", code: "C04", rawName: "基坑水平位移监测", rawUnit: "点", rawQty: 16, rawUnitPrice: 121.26, priceBasis: "taxed", taxRate: 0.06, rawAmount: 1940.16, source: D("C04 基坑水平位移监测"), note: "原报 16 点，漏列 2 点；CLARIFY-01 确认应为 18 点，单价不变、金额重算" },
    { id: "D-C05", vendor: "D", code: "C05", rawName: "基坑竖向位移监测", rawUnit: "点", rawQty: 18, rawUnitPrice: 110.24, priceBasis: "taxed", taxRate: 0.06, rawAmount: 1984.32, source: D("C05 基坑竖向位移监测") },
    { id: "D-C06", vendor: "D", code: "C06", rawName: "地下水位观测", rawUnit: "孔", rawQty: 6, rawUnitPrice: 165.36, priceBasis: "taxed", taxRate: 0.06, rawAmount: 992.16, source: D("C06 地下水位观测") },
    { id: "D-C07", vendor: "D", code: "C07", rawName: "地表沉降监测", rawUnit: "点", rawQty: 20, rawUnitPrice: 88.19, priceBasis: "taxed", taxRate: 0.06, rawAmount: 1763.8, source: D("C07 地表沉降监测") },
    { id: "D-C08", vendor: "D", code: "C08", rawName: "低应变检测", rawUnit: "根", rawQty: 60, rawUnitPrice: 93.7, priceBasis: "taxed", taxRate: 0.06, rawAmount: 5622.0, source: D("C08 低应变检测") },
    { id: "D-C09", vendor: "D", code: "C09", rawName: "声波透射检测", rawUnit: "根", rawQty: 12, rawUnitPrice: 496.08, priceBasis: "taxed", taxRate: 0.06, rawAmount: 5952.96, source: D("C09 声波透射检测") },
    { id: "D-C10", vendor: "D", code: "C10", rawName: "混凝土回弹检测", rawUnit: "构件", rawQty: 30, rawUnitPrice: 132.29, priceBasis: "taxed", taxRate: 0.06, rawAmount: 3968.7, source: D("C10 混凝土回弹检测") },
    { id: "D-C11", vendor: "D", code: "C11", rawName: "土工含水率试验", rawUnit: "组", rawQty: 10, rawUnitPrice: 66.14, priceBasis: "taxed", taxRate: 0.06, rawAmount: 661.4, source: D("C11 土工含水率试验") },
    { id: "D-C12", vendor: "D", code: "C12", rawName: "土工密度试验", rawUnit: "组", rawQty: 10, rawUnitPrice: 104.73, priceBasis: "taxed", taxRate: 0.06, rawAmount: 1047.3, source: D("C12 土工密度试验") },
    { id: "D-C13", vendor: "D", code: "C13", rawName: "机械进出场", rawUnit: "项", rawQty: 1, rawUnitPrice: 3307.2, priceBasis: "taxed", taxRate: 0.06, rawAmount: 3307.2, source: D("C13 机械进出场") },
    { id: "D-C14", vendor: "D", code: "C14", rawName: "测量设备使用（按项）", rawUnit: "项", rawQty: 1, rawUnitPrice: 3086.72, priceBasis: "taxed", taxRate: 0.06, rawAmount: 3086.72, source: { factId: "F06", label: "丁方报价截图-1.png · C14 测量设备使用（项）" }, note: "按 1 项计价 3,086.72 元，与标准清单「台班」口径不可直接换算；聊天记录确认台班数待定；CLARIFY-01 确认该项包含 4 个台班，总价均分 771.68 元/台班" },
    { id: "D-C15", vendor: "D", code: "C15", rawName: "成果整理与报告", rawUnit: "项", rawQty: 1, rawUnitPrice: 1984.32, priceBasis: "taxed", taxRate: 0.06, rawAmount: 1984.32, source: D("C15 成果整理与报告") },
  ],
};

export const VENDORS: VendorQuote[] = [vendorA, vendorB, vendorC, vendorD];

export const VENDOR_BY_ID = Object.fromEntries(VENDORS.map((v) => [v.id, v])) as Record<
  VendorQuote["id"],
  VendorQuote
>;
