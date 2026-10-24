'use client';

import type { Issue, Stage } from '@/lib/case/types';
import {
  ISSUE_STATUS_COLOR,
  ISSUE_STATUS_LABEL,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  VENDOR_SHORT,
} from '@/lib/ui/tokens';
import { cn } from '@/lib/cn';

/**
 * 待核查线索列表：异常的severity、状态流转与依据出处。
 * 状态由阶段决定：待处理 → 已处理 / 保留线索（乙 C08）。
 */
export function IssueList({ issues, dense = false }: { issues: Issue[]; dense?: boolean }) {
  if (issues.length === 0) {
    return <p className="py-4 text-center text-xs text-black/45 dark:text-white/45">当前阶段没有未决线索</p>;
  }
  return (
    <ul className={cn('flex flex-col', dense ? 'gap-1' : 'gap-1.5')}>
      {issues.map((issue) => (
        <li
          key={issue.id}
          className={cn(
            'flex items-start gap-2.5 rounded-xl border border-black/[0.06] bg-black/[0.015] px-3 transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.07]',
            dense ? 'py-2' : 'py-2.5',
          )}
        >
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{ background: SEVERITY_COLOR[issue.severity] }}
            aria-label={`严重度 ${SEVERITY_LABEL[issue.severity]}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[13px] font-medium leading-5">{issue.title}</span>
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  color: ISSUE_STATUS_COLOR[issue.status],
                  background: `${ISSUE_STATUS_COLOR[issue.status]}14`,
                }}
              >
                {ISSUE_STATUS_LABEL[issue.status]}
              </span>
            </div>
            {!dense && <p className="mt-0.5 text-xs leading-5 text-black/55 dark:text-white/55">{issue.detail}</p>}
            {!dense && <p className="mt-0.5 text-[10px] text-black/40 dark:text-white/40">依据：{issue.basis}</p>}
          </div>
          {issue.vendor && (
            <span className="mt-0.5 shrink-0 rounded-md border border-black/10 px-1.5 py-0.5 text-[10px] text-black/60 dark:border-white/20 dark:text-white/60">
              {VENDOR_SHORT[issue.vendor]}
              {issue.code ? ` · ${issue.code}` : ''}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function filterStageIssues(issues: Issue[], stage: Stage, mode: 'active' | 'all') {
  if (mode === 'all') return issues;
  return issues.filter((i) => i.status !== 'resolved');
}
