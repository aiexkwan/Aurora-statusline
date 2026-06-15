#!/usr/bin/env bun
import { join } from 'path';
import { homedir } from 'os';
import type { InputJSON } from './types';
import { render } from './render';
import { trackSessionCost } from './cost-tracker';
import { getGitInfo } from './git';
import { persistCtxSession, buildRenderContext } from './context';

const CACHE_DIR = process.env.STATUSLINE_CACHE_DIR ?? join(homedir(), '.claude');
const MONTHLY_COST_PATH = join(CACHE_DIR, 'statusline-monthly-cost.json');

async function readStdin(): Promise<InputJSON> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk as Uint8Array);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  try {
    return JSON.parse(raw) as InputJSON;
  } catch {
    /* silent-ok: empty or invalid stdin → proceed with empty input */
  }
  return {};
}

async function main(): Promise<void> {
  const input = await readStdin();
  const cwd = input.workspace?.current_dir ?? input.cwd ?? '';
  const ctxWindowSize = input.context_window?.context_window_size;

  const gitInfo = getGitInfo(cwd);
  persistCtxSession(input.session_id, ctxWindowSize ?? 200000, !!ctxWindowSize);
  const monthlyCost = await trackSessionCost(input.session_id ?? 'unknown', input.cost?.total_cost_usd ?? 0, MONTHLY_COST_PATH);

  const ctx = buildRenderContext(input, gitInfo, monthlyCost);
  process.stdout.write(render(ctx));
}

main();
