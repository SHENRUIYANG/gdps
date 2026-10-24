'use client';

import { useStage } from '@/components/StageProvider';
import { STAGE_LABEL } from '@/lib/case/pipeline';
import type { Stage } from '@/lib/case/types';
import { cn } from '@/lib/cn';

const ORDER: Stage[] = ['raw', 'clarified', 'v2'];
const SHORT: Record<Stage, string> = { raw: '① 初始归集', clarified: '② 澄清后', v2: '③ 变更 V2' };

/** 演示阶段切换：初始归集 → 澄清后 → 变更 V2，全局生效并持久化 */
export function StageSwitcher() {
  const { stage, setStage, mounted } = useStage();

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-black/[0.03] p-1 dark:border-white/15 dark:bg-white/[0.06]" role="tablist" aria-label="演示阶段">
      {ORDER.map((s) => {
        const active = mounted && stage === s;
        return (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={active}
            title={STAGE_LABEL[s]}
            onClick={() => setStage(s)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'bg-white text-[color:var(--orb-primary,#1d4ed8)] shadow-sm dark:bg-white/15 dark:text-white'
                : 'text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10',
            )}
          >
            {SHORT[s]}
          </button>
        );
      })}
    </div>
  );
}
