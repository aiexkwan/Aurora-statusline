import type { RenderContext } from './types';

export function makeBar(pct: number): string {
  const filled = Math.floor(pct / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function resolveModel(displayName: string): string {
  if (displayName.includes('Opus')) return `🥇`;
  if (displayName.includes('Sonnet')) return `🥈`;
  if (displayName.includes('Haiku')) return `🥉`;
  return displayName;
}

export function render(ctx: RenderContext): string {
  const { projectName, model, git } = ctx;

  const line1 = git.branchLabel
    ? `📁 ${projectName} | ${model} | ${git.branchLabel} | UnCommit: ${git.uncommittedCount} | Commited: ${git.committedCount}`
    : `📁 ${projectName} | ${model} | UnCommit: ${git.uncommittedCount} | Commited: ${git.committedCount}`;

  const cxtSuffix = `🗯 Cxt [${ctx.ctxBar}] ${ctx.ctxPct}% | +${ctx.added} -${ctx.removed}`;
  const costSuffix = `API Est: ${formatUSD(ctx.monthlyCost)}/mth`;

  if (ctx.rateLimits) {
    const sessionPct = Math.round(ctx.rateLimits.five_hour?.used_percentage ?? 0);
    const weeklyPct = Math.round(ctx.rateLimits.seven_day?.used_percentage ?? 0);
    const line2 = `💬 Session [${makeBar(sessionPct)}] ${sessionPct}% | ${cxtSuffix}`;
    const line3 = `📅 Weekly [${makeBar(weeklyPct)}] ${weeklyPct}% | ${costSuffix}`;
    return `${line1}\n${line2}\n${line3}`;
  }

  const line2 = `💬 Session [${makeBar(0)}] N/A | ${cxtSuffix}`;
  const line3 = `📅 Weekly [${makeBar(0)}] N/A | ${costSuffix}`;
  return `${line1}\n${line2}\n${line3}`;
}
