'use client';

import type { CellStatus, CompareCell, VendorId } from '@/lib/case/types';
import { fmtMoney } from '@/lib/case/rules';
import { VENDOR_COLORS } from '@/lib/ui/tokens';
import { cn } from '@/lib/cn';

/** 单元格状态的视觉语言：短徽章（≤6字）+ tooltip 承载长说明 */
export const CELL_STATUS_META: Record<CellStatus, { label: string; color: string } | null> = {
  ok: null,
  missing: { label: '漏报', color: '#6b7280' },
  blank: { label: '未报价', color: '#dc2626' },
  duplicate: { label: '重复·计一次', color: '#d97706' },
  'amount-fixed': { label: '金额更正', color: '#16a34a' },
  'out-of-range': { label: '超区间', color: '#d97706' },
  'unit-converted': { label: '项→台班', color: '#2563eb' },
  'qty-adjusted': { label: '数量更正', color: '#2563eb' },
  'separate-fee': { label: '附件单列', color: '#d97706' },
  unconfirmed: { label: '项≠台班', color: '#d97706' },
};

const PLACEHOLDER_TIP: Partial<Record<CellStatus, string>> = {
  missing: '该分项在供应商原件中整行缺失，未知不可当 0',
  blank: '原件单价栏空白，未知不可当 0（见澄清纪要补价）',
};

interface Props {
  cell: CompareCell;
  basis: 'taxed' | 'untaxed';
  originalAmount?: number | null;
  onClick?: () => void;
}

/** 对比表单元格：单行紧凑——金额 + 徽章同行，长说明进 tooltip */
export function CellStatusView({ cell, basis, originalAmount, onClick }: Props) {
  const meta = CELL_STATUS_META[cell.status];
  const value = basis === 'taxed' ? cell.taxed : cell.untaxed;
  const tip = [cell.basisText, cell.source.label].join('\n');

  if (cell.status === 'missing' || cell.status === 'blank') {
    const meta0 = CELL_STATUS_META[cell.status];
    return (
      <button
        type="button"
        onClick={cell.status === 'blank' ? onClick : undefined}
        title={PLACEHOLDER_TIP[cell.status]}
        className="w-full text-right"
      >
        <span className="text-[11px]" style={{ color: meta0!.color }}>
          {meta0!.label}
        </span>
      </button>
    );
  }

  const showOriginal = cell.status === 'amount-fixed' && originalAmount != null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={tip}
      className={cn(
        'flex w-full items-baseline justify-end gap-1.5 whitespace-nowrap py-1 text-right transition-colors',
        onClick && 'rounded px-1.5 hover:bg-black/[0.05] dark:hover:bg-white/10',
      )}
    >
      {value == null ? (
        <span className="text-[11px] text-black/35 dark:text-white/35">—</span>
      ) : (
        <span
          className={cn(
            'font-mono text-[12.5px] tabular-nums',
            cell.status === 'out-of-range' && 'font-semibold text-[#d97706]',
            cell.status === 'unconfirmed' && 'text-black/55 dark:text-white/55',
          )}
        >
          {showOriginal && (
            <span className="mr-1 text-[10px] text-black/30 line-through dark:text-white/30">{fmtMoney(originalAmount)}</span>
          )}
          {fmtMoney(value)}
        </span>
      )}
      {meta && (
        <span
          className="shrink-0 rounded px-1 py-px text-[9px] font-medium leading-[14px]"
          style={{ color: meta.color, background: `${meta.color}16` }}
        >
          {meta.label}
        </span>
      )}
    </button>
  );
}

/** 表头供应商列标识 */
export function VendorHeader({ vendor, basis }: { vendor: VendorId; basis: 'taxed' | 'untaxed' }) {
  const name = { A: '甲', B: '乙', C: '丙', D: '丁' }[vendor];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: VENDOR_COLORS[vendor] }} />
      {name} · {basis === 'taxed' ? '含税' : '未税'}
    </span>
  );
}
