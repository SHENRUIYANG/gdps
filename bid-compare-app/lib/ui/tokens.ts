import type { Issue, VendorId } from '@/lib/case/types';

/** 四家供应商的稳定配色（图表与徽章共用） */
export const VENDOR_COLORS: Record<VendorId, string> = {
  A: '#2563eb',
  B: '#7c3aed',
  C: '#0f766e',
  D: '#d97706',
};

export const VENDOR_NAMES: Record<VendorId, string> = {
  A: '甲 · Excel 含税',
  B: '乙 · PDF 未税',
  C: '丙 · 扫描件 含税',
  D: '丁 · 微信截图 含税',
};

export const VENDOR_SHORT: Record<VendorId, string> = { A: '甲', B: '乙', C: '丙', D: '丁' };

export const SEVERITY_COLOR: Record<Issue['severity'], string> = {
  error: '#dc2626',
  warn: '#d97706',
  info: '#2563eb',
};

export const SEVERITY_LABEL: Record<Issue['severity'], string> = {
  error: '高',
  warn: '中',
  info: '低',
};

export const ISSUE_STATUS_LABEL: Record<Issue['status'], string> = {
  open: '待处理',
  resolved: '已处理',
  'kept-open': '保留线索',
};

export const ISSUE_STATUS_COLOR: Record<Issue['status'], string> = {
  open: '#dc2626',
  resolved: '#16a34a',
  'kept-open': '#d97706',
};
