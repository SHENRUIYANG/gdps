import { QUALIFICATIONS } from '@/lib/case/facts';
import { getSnapshot } from '@/lib/case/pipeline';
import { fmtMoney } from '@/lib/case/rules';
import type { Stage, VendorId } from '@/lib/case/types';

/**
 * 比选台账初稿导出（CSV，UTF-8 BOM，Excel 可直接打开继续修改）。
 * 五个区块对应比选输出模板：对比表 / 报价明细 / 需补充事项 / 操作记录 / 资格材料清单。
 */

const csv = (row: (string | number | null | undefined)[]) =>
  row.map((c) => {
    const s = c == null ? '' : String(c);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');

export function buildLedgerCsv(stage: Stage): string {
  const snap = getSnapshot(stage);
  const vendors: VendorId[] = ['A', 'B', 'C', 'D'];
  const lines: string[] = [];

  lines.push('【对比表】');
  lines.push(csv(['清单编号', '名称', '单位', '数量', '甲含税金额', '乙含税金额', '丙含税金额', '丁含税金额', '差异及待核对', '来源定位']));
  for (const row of snap.rows) {
    const cellText = (v: VendorId) => {
      const c = row.cells[v];
      if (c.status === 'missing') return '漏报';
      if (c.status === 'blank') return '未报价';
      return c.taxed != null ? fmtMoney(c.taxed) : c.untaxed != null ? `${fmtMoney(c.untaxed)}(未税)` : '—';
    };
    const flags = snap.issues
      .filter((i) => i.code === row.code && i.status !== 'resolved')
      .map((i) => `${i.title}[${i.status === 'kept-open' ? '保留线索' : '待处理'}]`)
      .join('；');
    lines.push(csv([
      row.code, row.name, row.unit, row.quantity,
      ...vendors.map(cellText),
      flags || '—',
      vendors.map((v) => `${v}: ${row.cells[v].source.label}`).join(' | '),
    ]));
  }
  lines.push(csv(['合计', '', '', '', ...vendors.map((v) => snap.summaries[v].taxedTotal != null ? fmtMoney(snap.summaries[v].taxedTotal) : snap.summaries[v].untaxedTotal != null ? `${fmtMoney(snap.summaries[v].untaxedTotal)}(未税)` : '—'), '甲=验算一致；乙=按明细重算；丙=含C13加计与C04更正；丁=含C04更正', '']));

  lines.push('');
  lines.push('【报价明细】');
  lines.push(csv(['供应商', '清单编号', '原始分项', '原单位', '原数量', '原单价', '原税率', '原金额', '统一数量', '未税金额', '税额', '含税金额', '折算依据', '来源位置']));
  for (const row of snap.rows) {
    for (const v of vendors) {
      const c = row.cells[v];
      if (c.status === 'missing') {
        lines.push(csv([snap.summaries[v].name, row.code, '（漏报）', '', '', '', '', '', row.quantity, '', '', '', '整行缺失', c.source.label]));
        continue;
      }
      lines.push(csv([
        snap.summaries[v].name, row.code, row.cells[v].source.label.split('·').pop()?.trim() ?? row.name,
        '', '', '', '', '', row.quantity,
        c.untaxed != null ? fmtMoney(c.untaxed) : '', c.tax != null ? fmtMoney(c.tax) : '',
        c.taxed != null ? fmtMoney(c.taxed) : '', c.basisText, c.source.label,
      ]));
    }
  }

  lines.push('');
  lines.push('【需补充事项】');
  lines.push(csv(['事项编号', '供应商', '清单编号', '问题', '处理状态', '依据']));
  for (const i of snap.issues) {
    lines.push(csv([i.id, i.vendor ?? '', i.code ?? '', i.title, i.status === 'open' ? '待处理' : i.status === 'kept-open' ? '保留线索' : '已处理', i.basis]));
  }

  lines.push('');
  lines.push('【操作记录】');
  lines.push(csv(['操作时间', '操作者', '供应商', '分项', '原值', '新值', '变更依据']));
  for (const o of snap.ops) {
    lines.push(csv([o.time, o.operator, o.vendor, o.code, o.field ? `${o.field}: ${o.oldValue}` : o.oldValue, o.newValue, o.basis]));
  }

  lines.push('');
  lines.push('【资格材料清单】');
  lines.push(csv(['供应商', '材料类别', '文件编号', '提交情况', '备注', '复核状态']));
  for (const q of QUALIFICATIONS) {
    lines.push(csv([
      q.vendor, q.category, q.docId ?? '', q.submitted ? '已提交' : '未提交',
      q.note, q.status === 'valid' ? '有效' : q.status === 'missing' ? '缺件待补' : '到期未续·待补',
    ]));
  }

  return `﻿${lines.join('\n')}`;
}

export function downloadLedgerCsv(stage: Stage) {
  const blob = new Blob([buildLedgerCsv(stage)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const label = stage === 'v2' ? 'V2' : 'V1';
  a.href = url;
  a.download = `GC-017-比选台账初稿-${label}-2026-09-${stage === 'v2' ? '20' : '19'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
