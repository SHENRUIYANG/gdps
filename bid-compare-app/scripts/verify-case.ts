/**
 * 赛题数据管线校验：核对三阶段快照与预期值（预期值来自原件与澄清/变更纪要的手工验算）。
 * 运行：npx tsx scripts/verify-case.ts
 */
import { getSnapshot } from "../lib/case/pipeline";
import { BOQ_ITEMS } from "../lib/case/boq";

let failed = 0;
function expectEq(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}: expected ${e}, got ${a}`);
  }
}

function cell(stage: "raw" | "clarified" | "v2", code: string, vendor: "A" | "B" | "C" | "D") {
  const row = getSnapshot(stage).rows.find((r) => r.code === code)!;
  return row.cells[vendor];
}

console.log("== 清单完整性 ==");
expectEq(BOQ_ITEMS.length, 15, "统一清单 15 行");

console.log("== raw 初始归集 ==");
const raw = getSnapshot("raw");
expectEq(raw.summaries.A.taxedTotal, 40545.0, "甲 含税合计 40,545.00（原件合计一致）");
expectEq(raw.summaries.A.verified, true, "甲 合计验算通过");
expectEq(raw.summaries.B.untaxedTotal, 56607.0, "乙 未税小计 56,607.00（去重、C09/C11 缺不计 0）");
expectEq(raw.summaries.B.taxedTotal, null, "乙 raw 含税合计=null（税率未给不得默认）");
expectEq(raw.summaries.C.taxedTotal, 41897.84, "丙 对齐含税合计 41,897.84（主表 38,505.84 + 附件 C13 3,392）");
expectEq(raw.summaries.D.taxedTotal, 41924.08, "丁 含税合计 41,924.08");
expectEq(cell("raw", "C09", "B").status, "blank", "乙 C09 单价空白");
expectEq(cell("raw", "C11", "B").status, "missing", "乙 C11 整行漏报");
expectEq(cell("raw", "C07", "B").status, "duplicate", "乙 C07 重复行");
expectEq(cell("raw", "C08", "B").status, "out-of-range", "乙 C08 超参考区间");
expectEq(cell("raw", "C04", "C").status, "ok", "丙 C04 raw 沿用原报金额（问题在金额非口径）");
expectEq(cell("raw", "C04", "C").taxed, 2181.8, "丙 C04 raw 金额=原报 2,181.80");
expectEq(cell("raw", "C13", "C").status, "separate-fee", "丙 C13 附件单列");
expectEq(cell("raw", "C04", "D").status, "ok", "丁 C04 raw 数量差异未处理");
expectEq(cell("raw", "C14", "D").status, "unconfirmed", "丁 C14 项≠台班 待书面确认");
expectEq(raw.issues.filter((i) => i.status === "open").length, 12, "raw 待核查线索 12 条全开");

console.log("== clarified 澄清后 ==");
const cla = getSnapshot("clarified");
expectEq(cla.summaries.A.taxedTotal, 40545.0, "甲 不变 40,545.00");
expectEq(cla.summaries.B.untaxedTotal, 62747.0, "乙 未税合计 62,747.00（+C09 5,520 +C11 620）");
expectEq(cla.summaries.B.taxedTotal, 66511.82, "乙 含税合计 66,511.82");
expectEq(cla.summaries.C.taxedTotal, 41877.84, "丙 含税合计 41,877.84（-20 差错 +3,392 加计）");
expectEq(cla.summaries.D.taxedTotal, 42166.6, "丁 含税合计 42,166.60（C04 +242.52）");
expectEq(cell("clarified", "C04", "C").taxed, 2161.8, "丙 C04 更正 2,161.80");
expectEq(cell("clarified", "C04", "C").status, "amount-fixed", "丙 C04 已按乘积更正");
expectEq(cell("clarified", "C04", "D").taxed, 2182.68, "丁 C04 18点 2,182.68");
expectEq(cell("clarified", "C09", "B").taxed, 5851.2, "乙 C09 补价后含税 5,851.20");
expectEq(cell("clarified", "C11", "B").taxed, 620.0 * 1.06, "乙 C11 补录含税 657.20");
expectEq(cell("clarified", "C14", "D").status, "unit-converted", "丁 C14 已按书面说明折算");
expectEq(cell("clarified", "C14", "D").taxed, 3086.72, "丁 C14 折算前后总价不变 3,086.72");
expectEq(cell("clarified", "C14", "D").untaxedUnitPrice, 728.0, "丁 C14 未税单价 728.00 落回区间 560–840");
expectEq(cell("clarified", "C08", "B").status, "out-of-range", "乙 C08 异常线索保留（不改写）");
const claOpen = cla.issues.filter((i) => i.status === "open");
const claKept = cla.issues.filter((i) => i.status === "kept-open");
expectEq(claOpen.length, 2, "澄清后仍未关闭 2 条（乙/丁资质）");
expectEq(claKept.length, 1, "保留线索 1 条（乙 C08）");
expectEq(cla.ops.length, 11, "澄清留痕 11 条");

console.log("== v2 变更后 ==");
const v2 = getSnapshot("v2");
expectEq(v2.summaries.A.taxedTotal, 41626.2, "甲 V2 41,626.20（+1,081.20）");
expectEq(v2.summaries.B.untaxedTotal, 68747.0, "乙 V2 未税 68,747.00（+6,000）");
expectEq(v2.summaries.B.taxedTotal, 72871.82, "乙 V2 含税 72,871.82");
expectEq(v2.summaries.C.taxedTotal, 42991.44, "丙 V2 42,991.44（+1,113.60）");
expectEq(v2.summaries.D.taxedTotal, 43291.0, "丁 V2 43,291.00（+1,124.40）");
const c08 = v2.rows.find((r) => r.code === "C08")!;
expectEq(c08.quantity, 72, "C08 数量 72 根");
expectEq(c08.prevQuantity, 60, "C08 保留变更前数量 60 根");
expectEq(cell("v2", "C08", "A").taxed, 6487.2, "甲 C08 72×90.10=6,487.20");
expectEq(cell("v2", "C08", "B").untaxed, 36000.0, "乙 C08 72×500=36,000.00（未税）");
expectEq(v2.ops.length, 19, "变更后累计留痕 19 条（澄清11+变更8）");

console.log("== 全量区间扫描：仅乙 C08 超区间 ==");
for (const stage of ["raw", "clarified", "v2"] as const) {
  const outRows = getSnapshot(stage).rows
    .flatMap((r) => Object.values(r.cells))
    .filter((c) => c.status === "out-of-range")
    .map((c) => `${c.vendor}-${c.code}`);
  expectEq(outRows, ["B-C08"], `${stage} 阶段超区间仅乙 C08`);
}

if (failed > 0) {
  console.error(`\n${failed} 项校验失败`);
  process.exit(1);
}
console.log("\n全部校验通过 ✓");
