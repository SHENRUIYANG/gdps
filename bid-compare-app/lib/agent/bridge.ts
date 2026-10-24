/**
 * OMPH Agent 桥适配层。
 * 业务页只能经 window.ORBAIRuntime.agent：prompt / cancel / getHistory / onEvent。
 * 检测不到桥时由 UI 显示 OMPH REQUIRED，不做直连模型或浏览器降级。
 */

export interface BridgeEvent {
  kind: 'status' | 'text-delta' | 'reasoning-delta' | 'tool-call' | 'tool-result' | 'approval-requested' | 'error';
  status?: 'running' | 'idle';
  reason?: { kind?: string } | string;
  text?: string;
  callId?: string;
  name?: string;
  args?: unknown;
  isError?: boolean;
  toolName?: string;
  message?: string;
}

export interface BridgePrompt {
  text: string;
  context?: string;
  contract?: { version: 1; requiredPlugins: string[] };
  newSession?: boolean;
}

export interface AgentBridge {
  prompt(p: BridgePrompt): Promise<unknown>;
  cancel(): void | Promise<void>;
  getHistory(): Promise<{ messages?: unknown[] }>;
  onEvent(cb: (e: BridgeEvent) => void): () => void;
}

export function getAgentBridge(): AgentBridge | null {
  const w = globalThis as unknown as { window?: { ORBAIRuntime?: { agent?: unknown } } };
  const a = w.window?.ORBAIRuntime?.agent;
  return (a as AgentBridge) ?? null;
}
