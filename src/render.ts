import type { RenderContext, StatuslineConfig } from './types';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

type ColorMode = 'ansi' | 'plain';

interface DisplayOpts {
  barWidth: number;
  colorMode: ColorMode;
  hasConfig: boolean;
}

function pickColor(pct: number, colorMode?: ColorMode): string {
  if (colorMode === 'plain') return '';
  if (pct > 80) return RED;
  if (pct >= 60) return YELLOW;
  return GREEN;
}

export function makeBar(pct: number, width = 10, colorMode: ColorMode = 'ansi'): string {
  const filled = Math.min(width, Math.max(0, Math.floor((pct / 100) * width)));
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const color = pickColor(pct, colorMode);
  const reset = colorMode === 'plain' ? '' : RESET;
  return `${color}${bar}${reset}`;
}

function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function resolveModel(modelId: string | undefined, displayName: string): string {
  const raw = modelId ?? displayName;
  return raw.startsWith('claude-') ? raw.slice(7) : raw;
}

export function formatCountdown(resetsAt: number | string | undefined): string {
  if (resetsAt === undefined || resetsAt === '') return '??m';
  const target = typeof resetsAt === 'number' ? resetsAt * 1000 : Date.parse(resetsAt);
  if (Number.isNaN(target)) return '??m';
  const ms = target - Date.now();
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return '<1m';
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}hr ${m}m`;
}

function rateLimitLabel(pct: number | null, resetsAt: number | string | undefined): string {
  if (pct === null) return 'N/A';
  const cd = formatCountdown(resetsAt);
  return cd !== '??m' ? `${pct}% Reset: ${cd}` : `${pct}%`;
}

function pushGitCounts(segs: string[], ctx: RenderContext, hide: boolean): void {
  if (!hide || ctx.git.uncommittedCount !== 0) segs.push(`UnCommit: ${ctx.git.uncommittedCount}`);
  if (!hide || ctx.git.committedCount !== 0) segs.push(`Commited: ${ctx.git.committedCount}`);
}

function pushLinesChanged(segs: string[], ctx: RenderContext, hide: boolean): void {
  if (!hide || ctx.added !== 0 || ctx.removed !== 0) segs.push(`+${ctx.added} -${ctx.removed}`);
}

function pushCacheHit(segs: string[], ctx: RenderContext, hide: boolean): void {
  if (!hide || ctx.cacheHitPct !== null) {
    const cacheLabel = ctx.cacheHitPct !== null ? `Cache ${ctx.cacheHitPct}%` : 'Cache N/A';
    segs.push(`🎯 ${cacheLabel}`);
  }
}

function buildLine1(ctx: RenderContext, feat: StatuslineConfig['features'] | undefined): string {
  const segs: string[] = [`📁 ${ctx.projectName}`, ctx.model];
  if (feat?.reasoningEffort !== false && ctx.reasoningEffort != null) {
    segs.push(`⚡ ${ctx.reasoningEffort}`);
  }
  if (feat?.agentName !== false && ctx.agentName) {
    segs.push(`🤖 ${ctx.agentName}`);
  }
  if (feat?.git !== false && ctx.git.branchLabel) segs.push(ctx.git.branchLabel);
  if (feat?.git !== false) pushGitCounts(segs, ctx, feat !== undefined && feat.smartHide !== false);
  return segs.join(' | ');
}

function buildLine2(ctx: RenderContext, feat: StatuslineConfig['features'] | undefined, opts: DisplayOpts): string {
  const sessionPct = ctx.rateLimits ? Math.round(ctx.rateLimits.five_hour?.used_percentage ?? 0) : null;
  const segs: string[] = [];
  if (feat?.rateLimits !== false) {
    const sessionBar = `[${makeBar(sessionPct ?? 0, opts.barWidth, opts.colorMode)}]`;
    segs.push(`💬 Session ${sessionBar} ${rateLimitLabel(sessionPct, ctx.rateLimits?.five_hour?.resets_at)}`);
  }
  if (feat?.contextWindow !== false) {
    const ctxBar = opts.hasConfig ? makeBar(ctx.ctxPct, opts.barWidth, opts.colorMode) : ctx.ctxBar;
    segs.push(`🗯 Ctx Win [${ctxBar}] ${ctx.ctxPct}%`);
  }
  if (feat?.linesChanged !== false) pushLinesChanged(segs, ctx, feat !== undefined && feat.smartHide !== false);
  return segs.join(' | ');
}

function buildLine3(ctx: RenderContext, feat: StatuslineConfig['features'] | undefined, opts: DisplayOpts): string {
  const weeklyPct = ctx.rateLimits ? Math.round(ctx.rateLimits.seven_day?.used_percentage ?? 0) : null;
  const segs: string[] = [];
  if (feat?.rateLimits !== false) {
    const weeklyBar = `[${makeBar(weeklyPct ?? 0, opts.barWidth, opts.colorMode)}]`;
    segs.push(`📅 Weekly ${weeklyBar} ${rateLimitLabel(weeklyPct, ctx.rateLimits?.seven_day?.resets_at)}`);
  }
  if (feat?.cacheHit !== false) pushCacheHit(segs, ctx, feat !== undefined && feat.smartHide !== false);
  if (feat?.sessionCost !== false) segs.push(`Session: ${formatUSD(ctx.sessionCost)}`);
  if (feat?.monthlyCost !== false) segs.push(`API Est: ${formatUSD(ctx.monthlyCost)}/mth`);
  return segs.join(' | ');
}

export function render(ctx: RenderContext, config?: StatuslineConfig): string {
  const opts: DisplayOpts = {
    barWidth: config?.display?.barWidth ?? 10,
    colorMode: config?.display?.colorMode ?? 'ansi',
    hasConfig: config !== undefined,
  };
  const feat = config?.features;
  const line1 = buildLine1(ctx, feat);
  const line2 = buildLine2(ctx, feat, opts);
  const line3 = buildLine3(ctx, feat, opts);
  const lines = [line1];
  if (line2) lines.push(line2);
  if (line3) lines.push(line3);
  return lines.join('\n');
}
