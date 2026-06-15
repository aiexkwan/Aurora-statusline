import type { RenderContext } from './types';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function pickColor(pct: number): string {
  if (pct > 80) return RED;
  if (pct >= 60) return YELLOW;
  return GREEN;
}

function formatBarLabel(pct: number | null): string {
  const value = pct ?? 0;
  const suffix = pct !== null ? `${pct}%` : 'N/A';
  return `[${makeBar(value)}] ${suffix}`;
}

export function makeBar(pct: number): string {
  const filled = Math.floor(pct / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${pickColor(pct)}${bar}${RESET}`;
}

export function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function resolveModel(modelId: string | undefined, displayName: string): string {
  const raw = modelId ?? displayName;
  return raw.startsWith('claude-') ? raw.slice(7) : raw;
}

export function render(ctx: RenderContext): string {
  const { projectName, model, git } = ctx;

  const branchSegment = git.branchLabel ? ` | ${git.branchLabel}` : '';
  const line1 = `📁 ${projectName} | ${model}${branchSegment} | UnCommit: ${git.uncommittedCount} | Commited: ${git.committedCount}`;

  const cxtSuffix = `🗯 Cxt [${ctx.ctxBar}] ${ctx.ctxPct}% | +${ctx.added} -${ctx.removed}`;
  const costSuffix = `API Est: ${formatUSD(ctx.monthlyCost)}/mth`;

  const sessionPct = ctx.rateLimits ? Math.round(ctx.rateLimits.five_hour?.used_percentage ?? 0) : null;
  const weeklyPct = ctx.rateLimits ? Math.round(ctx.rateLimits.seven_day?.used_percentage ?? 0) : null;

  const sessionLabel = formatBarLabel(sessionPct);
  const weeklyLabel = formatBarLabel(weeklyPct);

  const line2 = `💬 Session ${sessionLabel} | ${cxtSuffix}`;
  const cacheLabel = ctx.cacheHitPct !== null ? `Cache ${ctx.cacheHitPct}%` : 'Cache N/A';
  const line3 = `📅 Weekly ${weeklyLabel} | 🎯 ${cacheLabel} | Session: ${formatUSD(ctx.sessionCost)} | ${costSuffix}`;

  return `${line1}\n${line2}\n${line3}`;
}
