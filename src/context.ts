import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import type { InputJSON, GitInfo, RenderContext } from './types';
import { makeBar, resolveModel } from './render';

const CACHE_DIR = process.env.STATUSLINE_CACHE_DIR ?? join(homedir(), '.claude');
const CTX_SESSION_DIR = join(CACHE_DIR, '.ctx-session');

export function persistCtxSession(sessionId: string | undefined, ctxSize: number, hasCtxWindowSize: boolean): void {
  if (!sessionId || !/^[a-zA-Z0-9_-]+$/.test(sessionId) || !hasCtxWindowSize) return;
  try {
    if (!existsSync(CTX_SESSION_DIR)) mkdirSync(CTX_SESSION_DIR, { recursive: true });
    const payload = JSON.stringify({ windowSize: ctxSize, updatedAt: new Date().toISOString() });
    writeFileSync(join(CTX_SESSION_DIR, `${sessionId}.json`), payload);
  } catch {
    /* silent-ok: best-effort cache — silent fail */
  }
}

function calcCtxPct(input: InputJSON, ctxSize: number): number {
  const currentUsage = input.context_window?.current_usage;
  if (currentUsage) {
    const inputTokens = currentUsage.input_tokens ?? 0;
    const cacheCreate = currentUsage.cache_creation_input_tokens ?? 0;
    const cacheRead = currentUsage.cache_read_input_tokens ?? 0;
    return Math.floor(((inputTokens + cacheCreate + cacheRead) * 100) / ctxSize);
  }
  const totalInput = input.context_window?.total_input_tokens ?? 0;
  return Math.floor((totalInput * 100) / ctxSize);
}

export function calcCacheHitPct(currentUsage: NonNullable<InputJSON['context_window']>['current_usage']): number | null {
  if (!currentUsage) return null;
  const cacheCreate = currentUsage.cache_creation_input_tokens ?? 0;
  const cacheRead = currentUsage.cache_read_input_tokens ?? 0;
  if (cacheCreate + cacheRead === 0) return null;
  return Math.round((cacheRead / (cacheRead + cacheCreate)) * 100);
}

export function buildRenderContext(input: InputJSON, gitInfo: GitInfo, monthlyCost: number): RenderContext {
  const cwd = input.workspace?.current_dir ?? input.cwd ?? '';
  const ctxSize = input.context_window?.context_window_size ?? 200000;
  const ctxPct = calcCtxPct(input, ctxSize);

  return {
    projectName: cwd.split('/').filter(Boolean).at(-1) ?? '',
    model: resolveModel(input.model?.id, input.model?.display_name ?? 'Unknown'),
    git: gitInfo,
    ctxBar: makeBar(ctxPct),
    ctxPct,
    added: input.cost?.total_lines_added ?? 0,
    removed: input.cost?.total_lines_removed ?? 0,
    monthlyCost,
    rateLimits: input.rate_limits,
    cacheHitPct: calcCacheHitPct(input.context_window?.current_usage),
  };
}
