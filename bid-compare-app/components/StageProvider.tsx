'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Stage } from '@/lib/case/types';

/**
 * 演示阶段：raw（初始归集）→ clarified（CLARIFY-01 澄清后）→ v2（CHANGE-01 变更后）。
 * 全局共享，页面与 Agent 面板都可推进；localStorage 持久化，挂载后恢复。
 */
interface StageContextValue {
  stage: Stage;
  setStage: (s: Stage) => void;
  mounted: boolean;
}

const StageContext = createContext<StageContextValue>({
  stage: 'v2',
  setStage: () => {},
  mounted: false,
});

const STORAGE_KEY = 'bid-compare:stage';

export function StageProvider({ children }: { children: ReactNode }) {
  const [stage, setStageState] = useState<Stage>('v2');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'raw' || saved === 'clarified' || saved === 'v2') setStageState(saved);
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  const value = useMemo<StageContextValue>(
    () => ({
      stage,
      setStage: (s) => {
        setStageState(s);
        try {
          window.localStorage.setItem(STORAGE_KEY, s);
        } catch {
          // ignore
        }
      },
      mounted,
    }),
    [stage, mounted],
  );

  return <StageContext.Provider value={value}>{children}</StageContext.Provider>;
}

export function useStage() {
  return useContext(StageContext);
}
