import type { BoqCode, BoqItem, RefRange } from "./types";

/**
 * 统一比选清单（15 行）与未税单价参考区间。
 * 事实来源：F08 标准比选清单与参考区间.xlsx（原件只读，此处为数字化副本）。
 */
export const BOQ_ITEMS: BoqItem[] = [
  { code: "C01", name: "控制点复核", unit: "点", quantity: 12, scope: "复核已有控制点" },
  { code: "C02", name: "地形测绘", unit: "亩", quantity: 20, scope: "同一园区地形测量" },
  { code: "C03", name: "建筑物沉降监测", unit: "点", quantity: 24, scope: "1个监测周期" },
  { code: "C04", name: "基坑水平位移监测", unit: "点", quantity: 18, scope: "1个监测周期" },
  { code: "C05", name: "基坑竖向位移监测", unit: "点", quantity: 18, scope: "1个监测周期" },
  { code: "C06", name: "地下水位观测", unit: "孔", quantity: 6, scope: "1个监测周期" },
  { code: "C07", name: "地表沉降监测", unit: "点", quantity: 20, scope: "1个监测周期" },
  { code: "C08", name: "低应变检测", unit: "根", quantity: 60, scope: "按提供的桩清单" },
  { code: "C09", name: "声波透射检测", unit: "根", quantity: 12, scope: "按提供的桩清单" },
  { code: "C10", name: "混凝土回弹检测", unit: "构件", quantity: 30, scope: "指定构件测区" },
  { code: "C11", name: "土工含水率试验", unit: "组", quantity: 10, scope: "单项试验" },
  { code: "C12", name: "土工密度试验", unit: "组", quantity: 10, scope: "单项试验" },
  { code: "C13", name: "机械进出场", unit: "项", quantity: 1, scope: "项目一次进出场" },
  { code: "C14", name: "测量设备使用", unit: "台班", quantity: 4, scope: "预计4个台班" },
  { code: "C15", name: "成果整理与报告", unit: "项", quantity: 1, scope: "含电子成果1套" },
];

/** V2 变更后的工程量（CHANGE-01：仅 C08 60→72） */
export const V2_QTY_OVERRIDES: Partial<Record<BoqCode, number>> = {
  C08: 72,
};

/** 未税单价参考区间（元），仅用于同范围、同单位、未税单价的异常提示 */
export const REF_RANGES: Record<BoqCode, RefRange> = {
  C01: { code: "C01", low: 144, high: 216 },
  C02: { code: "C02", low: 176, high: 264 },
  C03: { code: "C03", low: 72, high: 108 },
  C04: { code: "C04", low: 88, high: 132 },
  C05: { code: "C05", low: 80, high: 120 },
  C06: { code: "C06", low: 120, high: 180 },
  C07: { code: "C07", low: 64, high: 96 },
  C08: { code: "C08", low: 68, high: 102 },
  C09: { code: "C09", low: 360, high: 540 },
  C10: { code: "C10", low: 96, high: 144 },
  C11: { code: "C11", low: 48, high: 72 },
  C12: { code: "C12", low: 76, high: 114 },
  C13: { code: "C13", low: 2400, high: 3600 },
  C14: { code: "C14", low: 560, high: 840 },
  C15: { code: "C15", low: 1440, high: 2160 },
};

export const BOQ_BY_CODE: Record<BoqCode, BoqItem> = Object.fromEntries(
  BOQ_ITEMS.map((i) => [i.code, i]),
) as Record<BoqCode, BoqItem>;

/** 项目元信息 */
export const PROJECT = {
  code: "GC-017",
  name: "园区一批现场测量与检测工作 · 分包比选",
  owner: "上海山南勘测设计有限公司 商务部",
  currency: "CNY",
} as const;
