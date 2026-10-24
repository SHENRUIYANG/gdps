import type { PriceBasis } from "./types";

/**
 * 《项目范围与计算规则》(F10) 第三条的计算口径，逐条实现：
 * - 原报含税单价：含税金额 = ROUND(数量×含税单价, 2)；
 *   未税金额 = ROUND(含税金额/(1+税率), 2)；税额 = 含税金额 − 未税金额。
 * - 原报未税单价：未税金额 = ROUND(数量×未税单价, 2)；
 *   税额 = ROUND(未税金额×税率, 2)；含税金额 = 未税金额 + 税额。
 * - 税率未知时不得默认补写；数量或单价未知时结果为 null（未知值不可当作 0）。
 */

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export interface LineAmounts {
  untaxed: number | null;
  tax: number | null;
  taxed: number | null;
}

export function computeLineAmounts(
  qty: number | null,
  unitPrice: number | null,
  basis: PriceBasis,
  taxRate: number | null,
): LineAmounts {
  if (qty == null || unitPrice == null) {
    return { untaxed: null, tax: null, taxed: null };
  }
  if (basis === "taxed") {
    const taxed = round2(qty * unitPrice);
    if (taxRate == null) return { untaxed: null, tax: null, taxed };
    const untaxed = round2(taxed / (1 + taxRate));
    return { untaxed, tax: round2(taxed - untaxed), taxed };
  }
  const untaxed = round2(qty * unitPrice);
  if (taxRate == null) return { untaxed, tax: null, taxed: null };
  const tax = round2(untaxed * taxRate);
  return { untaxed, tax, taxed: round2(untaxed + tax) };
}

/** 区间比对：返回 0=区间内，<0=低于下限（超出倍数），>0=高于上限 */
export function compareRange(value: number, low: number, high: number): 0 | -1 | 1 {
  if (value < low) return -1;
  if (value > high) return 1;
  return 0;
}

export const fmtMoney = (n: number | null | undefined, dash = "—"): string => {
  if (n == null) return dash;
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
