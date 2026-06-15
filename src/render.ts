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

export function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function resolveModel(modelId: string | undefined, displayName: string): string {
  const raw = modelId ?? displayName;
  return raw.startsWith('claude-') ? raw.slice(7) : raw;
}

function formatBarLabel(pct: number | null, width: number, colorMode: ColorMode): string {
  return `[${makeBar(pct ?? 0, width, colorMode)}] ${pct !== null ? `${pct}%` : 'N/A'}`;
}

function buildLine1(ctx: RenderContext, feat: StatuslineConfig['features'] | undefined): string {
  const segs: string[] = [`📁 ${ctx.projectName}`, ctx.model];
  if (feat?.git !== false && ctx.git.branchLabel) segs.push(ctx.git.branchLabel);
  if (feat?.git !== false) {
    segs.push(`UnCommit: ${ctx.git.uncommittedCount}`);
    segs.push(`Commited: ${ctx.git.committedCount}`);
  }
  return segs.join(' | ');
}

function buildLine2(ctx: RenderContext, feat: StatuslineConfig['features'] | undefined, opts: DisplayOpts): string {
  const sessionPct = ctx.rateLimits ? Math.round(ctx.rateLimits.five_hour?.used_percentage ?? 0) : null;
  const segs: string[] = [];
  if (feat?.rateLimits !== false) segs.push(`💬 Session ${formatBarLabel(sessionPct, opts.barWidth, opts.colorMode)}`);
  if (feat?.contextWindow !== false) {
    const ctxBar = opts.hasConfig ? makeBar(ctx.ctxPct, opts.barWidth, opts.colorMode) : ctx.ctxBar;
    segs.push(`🗯 Cxt [${ctxBar}] ${ctx.ctxPct}%`);
  }
  if (feat?.linesChanged !== false) segs.push(`+${ctx.added} -${ctx.removed}`);
  return segs.join(' | ');
}

function buildLine3(ctx: RenderContext, feat: StatuslineConfig['features'] | undefined, opts: DisplayOpts): string {
  const weeklyPct = ctx.rateLimits ? Math.round(ctx.rateLimits.seven_day?.used_percentage ?? 0) : null;
  const segs: string[] = [];
  if (feat?.rateLimits !== false) segs.push(`📅 Weekly ${formatBarLabel(weeklyPct, opts.barWidth, opts.colorMode)}`);
  if (feat?.cacheHit !== false) {
    const cacheLabel = ctx.cacheHitPct !== null ? `Cache ${ctx.cacheHitPct}%` : 'Cache N/A';
    segs.push(`🎯 ${cacheLabel}`);
  }
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
