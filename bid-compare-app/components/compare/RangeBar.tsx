'use client';

import type { BoqCode, CompareCell, VendorId } from '@/lib/case/types';
import { VENDOR_COLORS } from '@/lib/ui/tokens';

/**
 * 未税单价参考区间条：区间带 + 四家单价落点。
 * 出界值钉在边缘并加描边；不可比（项≠台班/漏报/未报价）不画点。
 */
export function RangeBar({ code, cells, low, high }: {
  code: BoqCode;
  cells: Record<VendorId, CompareCell>;
  low: number;
  high: number;
}) {
  const span = high - low || 1;
  // 区间外留 15% 余量，出界点钉边
  const clamp = (v: number) => Math.max(2, Math.min(98, ((v - low) / span) * 88 + 6));

  const dots = (Object.entries(cells) as [VendorId, CompareCell][]).filter(
    ([, c]) =>
      c.untaxedUnitPrice != null &&
      !['missing', 'blank', 'unconfirmed', 'separate-fee'].includes(c.status),
  );

  return (
    <div className="w-full min-w-[120px] px-1 py-0.5" title={`${code} 未税参考区间 ${low}–${high} 元`}>
      <div className="relative h-4">
        {/* 区间带 */}
        <div className="absolute inset-y-1.5 left-[6%] right-[6%] rounded-full bg-[#16a34a]/15" />
        <div className="absolute inset-y-0.5 left-1/2 w-px bg-black/10 dark:bg-white/15" />
        {/* 落点 */}
        {dots.map(([vendor, cell]) => {
          const out = cell.status === 'out-of-range' || (cell.untaxedUnitPrice! < low || cell.untaxedUnitPrice! > high);
          return (
            <span
              key={vendor}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border"
              style={{
                left: `${clamp(cell.untaxedUnitPrice!)}%`,
                background: VENDOR_COLORS[vendor],
                borderColor: out ? '#d97706' : 'transparent',
                borderWidth: out ? 2 : 0,
                boxShadow: '0 0 0 1px rgba(255,255,255,.6)',
              }}
              title={`${vendor} 未税 ${cell.untaxedUnitPrice} 元${out ? '（出界）' : ''}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] tabular-nums text-black/40 dark:text-white/40">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
