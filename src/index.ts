#!/usr/bin/env bun
/**
 * Claude Code Status Line - Bun TypeScript implementation
 * Uses built-in rate_limits field (since v2.1.80)
 * Weekly cost cache: tracks cumulative API-equivalent cost across sessions
 */

import { join } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync, writeFileSync } from "fs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InputJSON {
  model?: { display_name?: string };
  workspace?: { current_dir?: string };
  cwd?: string;
  session_id?: string;
  context_window?: {
    total_input_tokens?: number;
    context_window_size?: number;
    current_usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    } | null;
  };
  rate_limits?: {
    five_hour?: { used_percentage?: number; resets_at?: string };
    seven_day?: { used_percentage?: number; resets_at?: string };
  };
  cost?: {
    total_cost_usd?: number;
    total_lines_added?: number;
    total_lines_removed?: number;
  };
}

interface MonthlyCostCache {
  month: string;
  sessions: Record<string, number>;
}

interface GitInfo {
  branchLabel: string;
  uncommittedCount: number;
  committedCount: number;
}

interface RenderContext {
  projectName: string;
  model: string;
  git: GitInfo;
  ctxBar: string;
  ctxPct: number;
  added: number;
  removed: number;
  monthlyCost: number;
  rateLimits: InputJSON["rate_limits"];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_DIR = process.env.STATUSLINE_CACHE_DIR ?? join(homedir(), ".claude");
const MONTHLY_COST_PATH = join(CACHE_DIR, "statusline-monthly-cost.json");
const CTX_SESSION_DIR = join(CACHE_DIR, ".ctx-session");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBar(pct: number): string {
  const filled = Math.floor(pct / 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

// ─── Monthly Cost Cache ──────────────────────────────────────────────────────

async function loadMonthlyCostCache(currentMonth: string): Promise<MonthlyCostCache> {
  const empty: MonthlyCostCache = { month: currentMonth, sessions: {} };
  try {
    const file = Bun.file(MONTHLY_COST_PATH);
    if (await file.exists()) {
      const stored = (await file.json()) as MonthlyCostCache;
      if (stored.month === currentMonth) return stored;
      // else: new month → reset cache
    }
  } catch { /* silent-ok: cache read failure → start fresh */ }
  return empty;
}

async function updateMonthlyCost(sessionId: string, sessionCost: number): Promise<number> {
  const currentMonth = getCurrentMonth();
  const cache = await loadMonthlyCostCache(currentMonth);
  cache.sessions[sessionId] = sessionCost;
  try {
    await Bun.write(MONTHLY_COST_PATH, JSON.stringify(cache));
  } catch { /* silent-ok: cache write failure → continue without persisting */ }
  return Object.values(cache.sessions).reduce((sum, v) => sum + v, 0);
}

// ─── Git ─────────────────────────────────────────────────────────────────────

function gitRun(args: string[], cwd: string): string {
  const result = Bun.spawnSync(
    ["git", "-c", "core.fileMode=false", "-c", "advice.detachedHead=false", ...args],
    { cwd, stderr: "pipe" }
  );
  if (result.exitCode !== 0) return "";
  return new TextDecoder().decode(result.stdout).trim();
}

function getCommittedCount(cwd: string): number {
  const upstream = gitRun(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], cwd);
  if (!upstream) return 0;
  const countStr = gitRun(["rev-list", "--count", `${upstream}..HEAD`], cwd);
  return parseInt(countStr, 10) || 0;
}

function getGitInfo(cwd: string): GitInfo {
  const empty: GitInfo = { branchLabel: "", uncommittedCount: 0, committedCount: 0 };
  if (!cwd) return empty;

  const gitDir = join(cwd, ".git");
  if (!existsSync(gitDir)) return empty;

  const branch = gitRun(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  if (!branch) return empty;

  const statusOutput = gitRun(["status", "--porcelain"], cwd);
  const uncommittedCount = statusOutput ? statusOutput.split("\n").filter(Boolean).length : 0;
  const branchLabel = (branch === "main" || branch === "master") ? `🌿 ${branch}` : `🌱 ${branch}`;
  return { branchLabel, uncommittedCount, committedCount: getCommittedCount(cwd) };
}

// ─── Context Window ───────────────────────────────────────────────────────────

function persistCtxSession(sessionId: string | undefined, ctxSize: number, hasCtxWindowSize: boolean): void {
  if (!sessionId || !/^[a-zA-Z0-9_-]+$/.test(sessionId) || !hasCtxWindowSize) return;
  try {
    if (!existsSync(CTX_SESSION_DIR)) mkdirSync(CTX_SESSION_DIR, { recursive: true });
    writeFileSync(
      join(CTX_SESSION_DIR, `${sessionId}.json`),
      JSON.stringify({ windowSize: ctxSize, updatedAt: new Date().toISOString() }),
    );
  } catch { /* silent-ok: best-effort cache — silent fail */ }
}

function calcCtxPct(input: InputJSON, ctxSize: number): number {
  const totalInput = input.context_window?.total_input_tokens ?? 0;
  const currentUsage = input.context_window?.current_usage ?? null;
  if (currentUsage) {
    const current =
      (currentUsage.input_tokens ?? 0) +
      (currentUsage.cache_creation_input_tokens ?? 0) +
      (currentUsage.cache_read_input_tokens ?? 0);
    return Math.floor((current * 100) / ctxSize);
  }
  return Math.floor((totalInput * 100) / ctxSize);
}

// ─── Output ───────────────────────────────────────────────────────────────────

function resolveModel(displayName: string): string {
  if (displayName.includes("Opus")) return `🥇`;
  if (displayName.includes("Sonnet")) return `🥈`;
  if (displayName.includes("Haiku")) return `🥉`;
  return displayName;
}

function writeLine1(ctx: RenderContext): void {
  const { projectName, model, git } = ctx;
  if (git.branchLabel) {
    process.stdout.write(
      `📁 ${projectName} | ${model} | ${git.branchLabel} | UnCommit: ${git.uncommittedCount} | Commited: ${git.committedCount}`
    );
  } else {
    process.stdout.write(
      `📁 ${projectName} | ${model} | UnCommit: ${git.uncommittedCount} | Commited: ${git.committedCount}`
    );
  }
}

function writeLines23WithRateLimits(ctx: RenderContext, sessionPct: number, weeklyPct: number): void {
  process.stdout.write(
    `\n💬 Session [${makeBar(sessionPct)}] ${sessionPct}% | 🗯 Cxt [${ctx.ctxBar}] ${ctx.ctxPct}% | +${ctx.added} -${ctx.removed}`
  );
  process.stdout.write(
    `\n📅 Weekly [${makeBar(weeklyPct)}] ${weeklyPct}% | API Est: ${formatUSD(ctx.monthlyCost)}/mth`
  );
}

function writeLines23NoRateLimits(ctx: RenderContext): void {
  process.stdout.write(
    `\n💬 Session [░░░░░░░░░░] N/A | 🗯 Cxt [${ctx.ctxBar}] ${ctx.ctxPct}% | +${ctx.added} -${ctx.removed}`
  );
  process.stdout.write(
    `\n📅 Weekly [░░░░░░░░░░] N/A | API Est: ${formatUSD(ctx.monthlyCost)}/mth`
  );
}

function writeLines23(ctx: RenderContext): void {
  const rl = ctx.rateLimits;
  if (rl) {
    writeLines23WithRateLimits(ctx, Math.round(rl.five_hour?.used_percentage ?? 0), Math.round(rl.seven_day?.used_percentage ?? 0));
  } else {
    writeLines23NoRateLimits(ctx);
  }
}

// ─── Stdin ────────────────────────────────────────────────────────────────────

async function readStdin(): Promise<InputJSON> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk as Uint8Array);
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  try {
    return JSON.parse(raw) as InputJSON;
  } catch { /* silent-ok: empty or invalid stdin → proceed with empty input */ }
  return {};
}

// ─── Build Render Context ─────────────────────────────────────────────────────

async function resolveSessionCost(input: InputJSON): Promise<number> {
  const sessionId = input.session_id ?? "unknown";
  persistCtxSession(
    input.session_id,
    input.context_window?.context_window_size ?? 200000,
    !!input.context_window?.context_window_size,
  );
  return updateMonthlyCost(sessionId, input.cost?.total_cost_usd ?? 0);
}

async function buildRenderContext(input: InputJSON): Promise<RenderContext> {
  const cwd = input.workspace?.current_dir ?? input.cwd ?? "";
  const ctxSize = input.context_window?.context_window_size ?? 200000;
  const monthlyCost = await resolveSessionCost(input);
  const ctxPct = calcCtxPct(input, ctxSize);

  return {
    projectName: cwd ? cwd.split("/").filter(Boolean).at(-1) ?? "" : "",
    model: resolveModel(input.model?.display_name ?? "Unknown"),
    git: getGitInfo(cwd),
    ctxBar: makeBar(ctxPct),
    ctxPct,
    added: input.cost?.total_lines_added ?? 0,
    removed: input.cost?.total_lines_removed ?? 0,
    monthlyCost,
    rateLimits: input.rate_limits,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const input = await readStdin();
  const ctx = await buildRenderContext(input);
  writeLine1(ctx);
  writeLines23(ctx);
}

main();
