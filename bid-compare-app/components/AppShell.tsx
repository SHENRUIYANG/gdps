'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bot, ClipboardList, CAppPageLayout, CPageTransition, LayoutDashboard, Table2, type TreeMenuItem } from 'orbcafe-ui';

const menu: TreeMenuItem[] = [
  { id: 'overview', title: '总览', description: '比选状态、KPI 与待办', href: '/overview', icon: <LayoutDashboard className="w-4 h-4" data-nav="overview" /> },
  { id: 'facts', title: '事实', description: '原件资料库与事件时间线', href: '/facts', icon: <ClipboardList className="w-4 h-4" data-nav="facts" /> },
  { id: 'compare', title: '对比表', description: '统一清单 × 四家报价', href: '/compare', icon: <Table2 className="w-4 h-4" data-nav="compare" /> },
  { id: 'ai', title: 'AI 分析', description: '答疑、动态图表与台账', href: '/ai', icon: <Bot className="w-4 h-4" data-nav="ai" /> },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <CAppPageLayout
      appId="shannan-bid-compare"
      appTitle="分包比选工作台"
      menuData={menu}
      locale="zh"
      user={{ name: '商务部 · 演示账号', subtitle: 'GC-017 比选项目组' }}
      enableNavigationPinning
      defaultPinnedNavigationItemIds={['compare']}
      defaultNavigationMode="fixed"
    >
      <CPageTransition transitionKey={mounted ? pathname : 'init'} variant="slide-up" durationMs={200}>
        {children}
      </CPageTransition>
    </CAppPageLayout>
  );
}
