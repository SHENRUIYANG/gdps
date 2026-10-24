import { getSnapshot } from '@/lib/case/pipeline';
import type { Stage, VendorId } from '@/lib/case/types';
import { VENDOR_COLORS } from '@/lib/ui/tokens';

/** 动态 Dashboard 卡片模型（默认卡 + Agent 生成卡共用） */
export interface DashCard {
  key: string;
  title: string;
  subtitle?: string;
  chartType: 'bar' | 'column' | 'list' | 'donut' | 'metric' | 'line' | 'progress';
  data: { id: string; label: string; value: number; secondaryValue?: number }[];
  valuePrefix?: string;
  agentGenerated?: boolean;
  createdAt?: number;
}

const V: VendorId[] = ['A', 'B', 'C', 'D'];

/** 默认四张卡：随全局阶段联动 */
export function buildDefaultCards(stage: Stage): DashCard[] {
  const snap = getSnapshot(stage);
  const useUntaxed = stage === 'raw';
  const short = { A: '甲', B: '乙', C: '丙', D: '丁' } as const;

  const totalCard: DashCard = {
    key: 'default-total',
    title: '四家总价对比',
    subtitle: useUntaxed ? '未税口径（乙税率未定）' : '含税口径',
    chartType: 'bar',
    valuePrefix: '¥',
    data: V.map((v) => ({
      id: v,
      label: short[v],
      value: useUntaxed ? snap.summaries[v].untaxedTotal ?? 0 : snap.summaries[v].taxedTotal ?? 0,
    })),
  };

  const c08 = snap.rows.find((r) => r.code === 'C08')!;
  const c08Card: DashCard = {
    key: 'default-c08',
    title: 'C08 低应变检测 · 未税单价',
    subtitle: `参考区间 68–102 元/根 · 乙超上限约 4.9 倍（线索保留）`,
    chartType: 'column',
    valuePrefix: '¥',
    data: V.map((v) => ({
      id: v,
      label: short[v],
      value: c08.cells[v].untaxedUnitPrice ?? 0,
    })),
  };

  const active = snap.issues.filter((i) => i.status !== 'resolved');
  const byVendor = (v: VendorId) => active.filter((i) => i.vendor === v).length;
  const issueCard: DashCard = {
    key: 'default-issues',
    title: '未决线索分布',
    subtitle: `共 ${active.length} 条（待处理 ${active.filter((i) => i.status === 'open').length} · 保留 ${active.filter((i) => i.status === 'kept-open').length}）`,
    chartType: 'list',
    data: V.map((v) => ({ id: v, label: `${short[v]}方`, value: byVendor(v) })),
  };

  let fourth: DashCard;
  if (stage === 'v2') {
    const c = getSnapshot('clarified').summaries;
    fourth = {
      key: 'default-change',
      title: 'CHANGE-01 变更影响（V1→V2）',
      subtitle: 'C08 60→72 根 · 含税口径增量',
      chartType: 'bar',
      valuePrefix: '¥',
      data: V.map((v) => ({ id: v, label: short[v], value: Math.round(((snap.summaries[v].taxedTotal ?? 0) - (c[v].taxedTotal ?? 0)) * 100) / 100 })),
    };
  } else {
    const covered = (v: VendorId) =>
      snap.rows.filter((r) => !['missing', 'blank'].includes(r.cells[v].status)).length;
    fourth = {
      key: 'default-coverage',
      title: '统一清单覆盖度',
      subtitle: '15 项中已报价的分项数（漏报/空价不计）',
      chartType: 'list',
      data: V.map((v) => ({ id: v, label: `${short[v]}方`, value: covered(v), secondaryValue: 15 })),
    };
  }

  return [totalCard, c08Card, issueCard, fourth];
}

/** 从助手回复中解析 dashboard-card / set-stage 指令块（仅闭合的 json 围栏） */
export function parseAgentBlocks(content: string): { cards: DashCard[]; stageCommand: string | null } {
  const cards: DashCard[] = [];
  let stageCommand: string | null = null;
  const re = /```json\s*([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    try {
      const obj = JSON.parse(m[1]);
      if (obj?.type === 'dashboard-card' && Array.isArray(obj.data) && obj.data.length > 0 && typeof obj.title === 'string') {
        cards.push({
          key: `agent-${Date.now()}-${cards.length}`,
          title: String(obj.title).slice(0, 60),
          subtitle: obj.subtitle ? String(obj.subtitle).slice(0, 120) : undefined,
          chartType: (['bar', 'column', 'list', 'donut', 'metric', 'line', 'progress'] as const).includes(obj.chartType) ? obj.chartType : 'bar',
          data: obj.data.slice(0, 20).map((d: { id?: unknown; label?: unknown; value?: unknown }, i: number) => ({
            id: typeof d?.id === 'string' ? d.id : `item-${i}`,
            label: typeof d?.label === 'string' ? d.label : `条目 ${i + 1}`,
            value: Number(d?.value) || 0,
          })),
          valuePrefix: typeof obj.valuePrefix === 'string' ? obj.valuePrefix : undefined,
          agentGenerated: true,
          createdAt: Date.now(),
        });
      } else if (obj?.type === 'set-stage' && ['raw', 'clarified', 'v2'].includes(obj.stage)) {
        stageCommand = obj.stage;
      }
    } catch {
      // 非法 JSON 忽略
    }
  }
  return { cards, stageCommand };
}
