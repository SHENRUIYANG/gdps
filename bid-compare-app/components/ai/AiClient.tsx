'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AIBrowserGlow,
  CMetricChartCard,
  CPaper,
  CStack,
  CTypography,
  InputArea,
  OMPHPanel,
  type OMPHPanelStatus,
  type OMPHProcessItem,
  type OMPHTurn,
} from 'orbcafe-ui';
import { StageSwitcher } from '@/components/common/StageSwitcher';
import { useStage } from '@/components/StageProvider';
import { FACT_FILES } from '@/lib/case/facts';
import { getAgentBridge, type AgentBridge, type BridgeEvent } from '@/lib/agent/bridge';
import { buildContext } from '@/lib/agent/knowledge';
import { buildDefaultCards, parseAgentBlocks, type DashCard } from '@/lib/agent/dashboard';
import type { Stage } from '@/lib/case/types';
import { cn } from '@/lib/cn';

const QUICK_QUESTIONS = [
  '乙 C08 为什么标红？',
  '丁的设备使用费怎么对齐的？',
  'C08 变更后各家总价影响多少？',
  '生成乙超区间条目对比图',
  '应用澄清纪要，推进台账',
];

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AiClient() {
  const { stage, setStage, mounted } = useStage();
  const stageRef = useRef<Stage>(stage);
  stageRef.current = stage;

  const [turns, setTurns] = useState<OMPHTurn[]>([]);
  const [status, setStatus] = useState<OMPHPanelStatus>('idle');
  const [isResponding, setIsResponding] = useState(false);
  const [bridgeState, setBridgeState] = useState<'checking' | 'ready' | 'missing'>('checking');
  const [agentCards, setAgentCards] = useState<DashCard[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [eventStats, setEventStats] = useState<Record<string, number>>({});

  const bridgeRef = useRef<AgentBridge | null>(null);
  const sessionStartedRef = useRef(false);
  const turnIdRef = useRef<string | null>(null);
  const bufRef = useRef('');
  const rafRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const patchTurn = useCallback((id: string, fn: (t: OMPHTurn) => OMPHTurn) => {
    setTurns((current) => current.map((t) => (t.id === id ? fn(t) : t)));
  }, []);

  const appendAssistant = useCallback(
    (chunk: string) => {
      const id = turnIdRef.current;
      if (!id) return;
      bufRef.current += chunk;
      if (rafRef.current) return;
      // setTimeout 而非 rAF：窗口被遮挡时 macOS 暂停绘制、rAF 不触发，定时器仍可靠
      rafRef.current = window.setTimeout(() => {
        rafRef.current = 0;
        const text = bufRef.current;
        patchTurn(id, (t) => ({
          ...t,
          assistant: { id: `${id}-assistant`, content: text, timestamp: t.assistant?.timestamp ?? new Date(), streaming: true },
        }));
      }, 80);
    },
    [patchTurn],
  );

  const upsertProcess = useCallback(
    (id: string, item: OMPHProcessItem) => {
      const turnId = turnIdRef.current;
      if (!turnId) return;
      patchTurn(turnId, (t) => {
        const list = t.process ? [...t.process] : [];
        const idx = list.findIndex((p) => p.id === item.id);
        if (idx >= 0) list[idx] = item;
        else list.push(item);
        return { ...t, process: list };
      });
    },
    [patchTurn],
  );

  const finishTurn = useCallback(
    (reasonKind?: string) => {
      const id = turnIdRef.current;
      // 每次节流刷新写的都是全量缓冲，因此最终内容就是当前缓冲全文
      const fullText = bufRef.current;
      bufRef.current = '';
      turnIdRef.current = null;
      if (rafRef.current) {
        clearTimeout(rafRef.current);
        rafRef.current = 0;
      }
      setIsResponding(false);
      if (!id) return;
      setTurns((current) => {
        const turn = current.find((t) => t.id === id);
        if (turn) {
          const finalContent = fullText || turn.assistant?.content || '';
          const { cards, stageCommand } = parseAgentBlocks(finalContent);
          if (cards.length) setAgentCards((prev) => [...cards, ...prev].slice(0, 8));
          if (stageCommand) {
            const s = stageCommand as Stage;
            setStage(s);
            setToast(`已按 Agent 指令切换台账阶段：${s === 'clarified' ? '澄清后（CLARIFY-01）' : s === 'v2' ? '变更 V2（CHANGE-01）' : '初始归集'}`);
          }
        }
        return current.map((t) =>
          t.id === id
            ? {
                ...t,
                assistant: t.assistant
                  ? { ...t.assistant, content: fullText || t.assistant.content, streaming: false }
                  : undefined,
                process: (t.process ?? []).map((p) =>
                  p.status === 'running' || p.status === 'pending' ? { ...p, status: 'success' as const } : p,
                ),
              }
            : t,
        );
      });
      setStatus(reasonKind === 'error' ? 'error' : reasonKind === 'completed' ? 'success' : 'idle');
    },
    [setStage],
  );

  /* ---------- OMPH 桥事件订阅 ---------- */
  useEffect(() => {
    const bridge = getAgentBridge();
    if (!bridge) {
      setBridgeState('missing');
      return;
    }
    bridgeRef.current = bridge;
    setBridgeState('ready');
    const handler = (event: BridgeEvent) => {
      setEventStats((prev) => ({ ...prev, [event.kind]: (prev[event.kind] ?? 0) + 1 }));
      switch (event.kind) {
        case 'status':
          if (event.status === 'running') {
            setStatus('running');
            setIsResponding(true);
          } else {
            finishTurn(typeof event.reason === 'string' ? event.reason : event.reason?.kind);
          }
          break;
        case 'text-delta':
          appendAssistant(event.text ?? '');
          break;
        case 'reasoning-delta':
          upsertProcess('reasoning', { id: 'reasoning', kind: 'reasoning', title: '正在组织分析路径', status: 'running' });
          break;
        case 'tool-call':
          upsertProcess(event.callId ?? uid(), {
            id: event.callId ?? uid(),
            kind: 'tool',
            title: event.name ?? '工具调用',
            status: 'running',
          });
          break;
        case 'tool-result':
          upsertProcess(event.callId ?? uid(), {
            id: event.callId ?? uid(),
            kind: 'tool',
            title: event.name ?? '工具调用',
            status: event.isError ? 'error' : 'success',
            summary: (event.text ?? '').slice(0, 120),
          });
          break;
        case 'approval-requested':
          appendAssistant(
            `\n\n> ⚠️ 工具 **${event.toolName ?? ''}** 请求人工审批：${event.reason ?? ''}。请在 OMPH / Harness 审批界面处理后继续，本轮将等待审批结果。\n`,
          );
          break;
        case 'error':
          appendAssistant(`\n\n**错误**：${event.message ?? '未知错误'}（已保留本次部分结果）`);
          setStatus('error');
          break;
      }
    };
    const unsubscribe = bridge.onEvent(handler);
    return () => {
      unsubscribe?.();
    };
  }, [appendAssistant, finishTurn, upsertProcess]);

  useEffect(() => () => timersRef.current.forEach((t) => clearTimeout(t)), []);

  /* ---------- 演示回放（未连接 OMPH 宿主时的排练模式，非模型回答） ---------- */
  const runReplay = useCallback(
    (turnId: string, question: string) => {
      const replaySteps: OMPHProcessItem[] = [
        { id: 'rp-1', kind: 'reasoning', title: '演示回放：读取统一清单与计算规则', status: 'running' },
        { id: 'rp-2', kind: 'tool', title: '核对当前台账快照', status: 'pending' },
      ];
      const tick = (fn: () => void, ms: number) => timersRef.current.push(setTimeout(fn, ms) as unknown as number);
      patchTurn(turnId, (t) => ({ ...t, process: [...(t.process ?? []), ...replaySteps] }));
      tick(() => {
        upsertProcess('rp-1', { id: 'rp-1', kind: 'reasoning', title: '演示回放：读取统一清单与计算规则', status: 'success' });
        upsertProcess('rp-2', { id: 'rp-2', kind: 'tool', title: '核对当前台账快照', status: 'running' });
      }, 600);
      tick(() => upsertProcess('rp-2', { id: 'rp-2', kind: 'tool', title: '核对当前台账快照', status: 'success', summary: '15 项 · 四家 · 阶段快照一致' }), 1400);

      const answer =
        `**演示回放**（未连接 OMPH 宿主时的排练模式；在 OMPH 客户端中打开本应用即为真实 Agent 回答）\n\n` +
        `关于「${question}」：\n\n` +
        `- 乙 C08 未税单价 500.00 元/根，参考区间 68–102（[F08 标准比选清单与参考区间.xlsx](/facts/baseline.xlsx)），超上限约 4.9 倍；CLARIFY-01 确认维持报价，线索保留待商务评审（[F11 澄清纪要](/facts/clarification.txt)）。\n` +
        `- 其余三家 C08 未税单价 85.00 / 87.55 / 88.40 元/根，均在区间内。\n\n` +
        '```json\n' +
        JSON.stringify(
          {
            type: 'dashboard-card',
            title: 'C08 未税单价 vs 参考区间',
            subtitle: '演示回放生成 · 区间 68–102 元/根',
            chartType: 'column',
            valuePrefix: '¥',
            data: [
              { id: 'A', label: '甲', value: 85 },
              { id: 'B', label: '乙', value: 500 },
              { id: 'C', label: '丙', value: 87.55 },
              { id: 'D', label: '丁', value: 88.4 },
            ],
          },
          null,
          2,
        ) +
        '\n```\n';
      const chunk = 36;
      let i = 0;
      const stream = () => {
        if (turnIdRef.current !== turnId) return;
        if (i >= answer.length) {
          finishTurn('completed');
          return;
        }
        appendAssistant(answer.slice(i, i + chunk));
        i += chunk;
        tick(stream, 60);
      };
      tick(stream, 1900);
    },
    [appendAssistant, finishTurn, patchTurn, upsertProcess],
  );

  /* ---------- 发送 ---------- */
  const handleSend = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isResponding) return;
      const id = uid();
      turnIdRef.current = id;
      bufRef.current = '';
      setStatus('running');
      setIsResponding(true);
      setTurns((current) => [
        ...current,
        {
          id,
          startedAt: Date.now(),
          user: { id: `${id}-user`, content: trimmed, timestamp: new Date() },
          assistant: { id: `${id}-assistant`, content: '', timestamp: new Date(), streaming: true },
        },
      ]);

      const bridge = bridgeRef.current;
      if (bridge) {
        try {
          const isNew = !sessionStartedRef.current;
          sessionStartedRef.current = true;
          await bridge.prompt({
            text: trimmed,
            ...(isNew ? { context: buildContext(stageRef.current), newSession: true } : {}),
          });
        } catch (err) {
          appendAssistant(`\n\n**提交失败**：${err instanceof Error ? err.message : String(err)}。请检查 OMPH 宿主配置。`);
          finishTurn('error');
        }
      } else {
        runReplay(id, trimmed);
      }
    },
    [appendAssistant, finishTurn, isResponding, runReplay],
  );

  const handleStop = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    bridgeRef.current?.cancel?.();
    finishTurn('cancelled');
  }, [finishTurn]);

  /* ---------- 面板内文件预览 ---------- */
  const loadFilePreview = useCallback(
    async (ref: { path: string }, signal: AbortSignal) => {
      const clean = ref.path.replace(/^\//, '').split('?')[0];
      const fact = FACT_FILES.find((f) => f.path === clean);
      if (!fact) return { body: { kind: 'missing' as const, message: '未在事实库中找到该文件' } };
      if (fact.kind === 'excel') {
        const res = await fetch(`/${fact.path}`, { signal });
        const bytes = await res.arrayBuffer();
        return { body: { kind: 'sheet' as const, bytes, fileName: fact.name }, size: bytes.byteLength };
      }
      if (fact.kind === 'image' || fact.kind === 'chat') {
        return { body: { kind: 'image' as const, url: `/${fact.path}`, alt: fact.name } };
      }
      if (fact.kind === 'pdf') {
        return { body: { kind: 'embed' as const, url: `/${fact.path}`, mimeType: 'application/pdf', caption: fact.name } };
      }
      const res = await fetch(`/${fact.path}`, { signal });
      const text = await res.text();
      return { body: { kind: 'code' as const, text, language: 'text' }, size: text.length };
    },
    [],
  );

  const defaultCards = useMemo(() => (mounted ? buildDefaultCards(stage) : buildDefaultCards('v2')), [stage, mounted]);
  const allCards = [...agentCards, ...defaultCards];
  const moneyFmt = useCallback(
    (v: number) => (v >= 10000 || v % 1 !== 0 ? v.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : Math.round(v).toLocaleString('zh-CN')),
    [],
  );

  return (
    <>
      <AIBrowserGlow active={isResponding} />
      <div className="flex h-[calc(100vh-140px)] min-h-[560px] flex-col gap-3 p-4 md:p-6 xl:flex-row">
        {/* 动态 Dashboard */}
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <CPaper sx={{ padding: 14, borderRadius: 16 }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CStack spacing={0.5}>
                <CTypography variant="overline">动态 Dashboard · 随对话与台账阶段更新</CTypography>
                <div className="flex items-center gap-2">
                  <CTypography variant="h3">比选分析视图</CTypography>
                  {toast && (
                    <span className="rounded-lg bg-[#16a34a]/10 px-2 py-0.5 text-[11px] text-[#16a34a]">{toast}</span>
                  )}
                </div>
              </CStack>
              <StageSwitcher />
            </div>
          </CPaper>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              {allCards.map((card) => (
                <div key={card.key} className="relative">
                  {card.agentGenerated && (
                    <div className="absolute -top-1 right-1 z-10 flex items-center gap-1">
                      <span className="rounded-full bg-[#7c3aed] px-2 py-0.5 text-[9px] font-medium text-white">✨ Agent 生成</span>
                      <button
                        type="button"
                        aria-label="移除卡片"
                        onClick={() => setAgentCards((prev) => prev.filter((c) => c.key !== card.key))}
                        className="rounded-full bg-black/[0.06] px-1.5 text-[10px] leading-4 hover:bg-black/[0.12] dark:bg-white/10 dark:hover:bg-white/20"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <CMetricChartCard
                    title={card.title}
                    subtitle={card.subtitle}
                    data={card.data}
                    chartType={card.chartType}
                    valueFormatter={moneyFmt}
                    valueLabel={card.valuePrefix === '¥' ? '金额（元）' : '数值'}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* OMPH Panel */}
        <div className="flex min-h-0 w-full flex-col gap-2 xl:w-[440px] 2xl:w-[520px]">
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-2 text-[11px]',
              bridgeState === 'ready' && 'bg-[#16a34a]/10 text-[#16a34a]',
              bridgeState === 'missing' && 'bg-[#d97706]/10 text-[#d97706]',
              bridgeState === 'checking' && 'bg-black/[0.05] text-black/50 dark:bg-white/10 dark:text-white/50',
            )}
            role="status"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: 'currentColor' }} />
            {bridgeState === 'ready' && 'OMPH 宿主已连接 · 经 ORBAIRuntime.agent 桥调用（会话/权限由宿主管理）'}
            {bridgeState === 'missing' && '未检测到 OMPH 宿主：以下为演示回放（排练模式）。在 OMPH 客户端中打开本应用即为真实 Agent。'}
            {bridgeState === 'checking' && '正在检测 OMPH Agent 桥…'}
            {bridgeState === 'ready' && Object.keys(eventStats).length > 0 && (
              <span className="font-mono opacity-60">｜events: {Object.entries(eventStats).map(([k, v]) => `${k}×${v}`).join(' ')}</span>
            )}
          </div>

          <div className="min-h-0 flex-1">
            <OMPHPanel
              title="比选商务助手"
              description="GC-017 · 山南勘测分包比选"
              turns={turns}
              agentStatus={status}
              isResponding={isResponding}
              processDisplay="standard"
              loadFilePreview={loadFilePreview}
              onOpenFileExternally={(ref) => window.open(`/${ref.path.replace(/^\//, '')}`, '_blank')}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isResponding}
                onClick={() => handleSend(q)}
                className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] text-black/65 transition-colors hover:bg-black/[0.05] disabled:opacity-40 dark:border-white/20 dark:text-white/65 dark:hover:bg-white/10"
              >
                {q}
              </button>
            ))}
          </div>

          <InputArea
            onSend={handleSend}
            onStop={handleStop}
            isResponding={isResponding}
            placeholder="问任何比选数据问题，或让 Agent 生成图表 / 推进台账阶段…"
          />
        </div>
      </div>
    </>
  );
}
