import type { RenderContext } from './types';

export function makeBar(pct: number): string {
  const filled = Math.floor(pct / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
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

  const sessionLabel = sessionPct !== null ? `[${makeBar(sessionPct)}] ${sessionPct}%` : `[${makeBar(0)}] N/A`;
  const weeklyLabel = weeklyPct !== null ? `[${makeBar(weeklyPct)}] ${weeklyPct}%` : `[${makeBar(0)}] N/A`;

  const line2 = `💬 Session ${sessionLabel} | ${cxtSuffix}`;
  const line3 = `📅 Weekly ${weeklyLabel} | ${costSuffix}`;

  return `${line1}\n${line2}\n${line3}`;
}
