import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render, resolveModel, makeBar, formatCountdown } from './render';
import type { RenderContext } from './types';

import { calcCacheHitPct, buildRenderContext } from './context';

// ANSI escape codes
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

/** Strip all ANSI escape sequences from a string for structural assertions */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// Shared fixtures
const baseCtx: RenderContext = {
  projectName: 'my-project',
  model: 'sonnet-4-6',
  git: { branchLabel: '', uncommittedCount: 0, committedCount: 0 },
  ctxBar: '███░░░░░░░',
  ctxPct: 30,
  added: 12,
  removed: 3,
  monthlyCost: 4.56,
  sessionCost: 0,
  rateLimits: undefined,
  cacheHitPct: null,
};

const withBranch: RenderContext = {
  ...baseCtx,
  git: { branchLabel: '🌱 feat/new-module', uncommittedCount: 2, committedCount: 1 },
};

const withCacheHit: RenderContext = {
  ...baseCtx,
  cacheHitPct: 80,
};

const withRateLimits: RenderContext = {
  ...baseCtx,
  rateLimits: {
    five_hour: { used_percentage: 40 },
    seven_day: { used_percentage: 70 },
  },
};

const withBranchAndRateLimits: RenderContext = {
  ...withBranch,
  rateLimits: {
    five_hour: { used_percentage: 40 },
    seven_day: { used_percentage: 70 },
  },
};

describe('resolveModel(modelId, displayName)', () => {
  it('strips claude- prefix from modelId when provided', () => {
    assert.strictEqual(resolveModel('claude-opus-4-6[1m]', 'Opus 4.6'), 'opus-4-6[1m]');
  });

  it('falls back to displayName when modelId is undefined — Opus', () => {
    assert.strictEqual(resolveModel(undefined, 'Opus 4.6'), 'Opus 4.6');
  });

  it('falls back to displayName when modelId is undefined — Sonnet, not emoji', () => {
    assert.strictEqual(resolveModel(undefined, 'Sonnet 4.6'), 'Sonnet 4.6');
    assert.ok(resolveModel(undefined, 'Sonnet 4.6') !== '🥈');
  });

  it('falls back to displayName when modelId is undefined — Haiku, not emoji', () => {
    assert.strictEqual(resolveModel(undefined, 'Haiku 4.5'), 'Haiku 4.5');
    assert.ok(resolveModel(undefined, 'Haiku 4.5') !== '🥉');
  });

  it('strips claude- prefix for haiku variant, not the legacy emoji', () => {
    assert.strictEqual(resolveModel('claude-haiku-4-5-20251001', 'Haiku 4.5'), 'haiku-4-5-20251001');
  });

  it('strips claude- prefix and does not return emoji for Sonnet displayName when modelId is provided', () => {
    const result: string = resolveModel('claude-sonnet-4-6', 'Sonnet 4.6');
    assert.strictEqual(result, 'sonnet-4-6');
    assert.notStrictEqual(result, '🥈');
  });

  it('passes through non-claude- prefixed modelId as-is', () => {
    assert.strictEqual(resolveModel('custom-model-v1', 'Custom'), 'custom-model-v1');
  });
});

describe('render(ctx)', () => {
  it('renders line 1 with branchLabel when branchLabel is present', () => {
    const output = render(withBranchAndRateLimits);
    const line1 = output.split('\n')[0];
    assert.ok(line1.includes('📁 my-project'));
    assert.ok(line1.includes('sonnet-4-6'));
    assert.ok(line1.includes('🌱 feat/new-module'));
    assert.ok(line1.includes('UnCommit: 2'));
    assert.ok(line1.includes('Commited: 1'));
  });

  it('renders line 1 without branchLabel segment when branchLabel is empty', () => {
    const output = render(withRateLimits);
    const line1 = output.split('\n')[0];
    assert.ok(line1.includes('📁 my-project'));
    assert.ok(line1.includes('sonnet-4-6'));
    assert.ok(!line1.includes('🌱'));
    assert.ok(!line1.includes('🌿'));
    assert.ok(line1.includes('UnCommit: 0'));
    assert.ok(line1.includes('Commited: 0'));
  });

  it('renders rate limit bars when rateLimits is present (with branchLabel)', () => {
    const output = render(withBranchAndRateLimits);
    const lines = output.split('\n');
    // line 2: session bar with actual percentage — strip ANSI for structural check
    assert.ok(lines[1].includes('💬 Session ['));
    assert.ok(lines[1].includes('] ??m'));
    assert.ok(stripAnsi(lines[1]).includes('🗯 Cxt [███░░░░░░░] 30%'));
    assert.ok(lines[1].includes('+12 -3'));
    // line 3: weekly bar with countdown (no resets_at → ??m)
    assert.ok(lines[2].includes('📅 Weekly ['));
    assert.ok(lines[2].includes('] ??m'));
    assert.ok(lines[2].includes('API Est: $4.56/mth'));
  });

  it('renders N/A placeholders when rateLimits is absent (without branchLabel)', () => {
    const output = render(baseCtx);
    const lines = output.split('\n');
    // line 2: session bar shows N/A — strip ANSI for structural check
    assert.ok(stripAnsi(lines[1]).includes('💬 Session [░░░░░░░░░░] N/A'));
    assert.ok(stripAnsi(lines[1]).includes('🗯 Cxt [███░░░░░░░] 30%'));
    assert.ok(lines[1].includes('+12 -3'));
    // line 3: weekly bar shows N/A
    assert.ok(stripAnsi(lines[2]).includes('📅 Weekly [░░░░░░░░░░] N/A'));
    assert.ok(lines[2].includes('API Est: $4.56/mth'));
  });

  it('renders Cache XX% on line 3 when cacheHitPct is a number', () => {
    const output = render(withCacheHit);
    const line3 = output.split('\n')[2];
    assert.ok(line3.includes('Cache 80%'));
  });

  it('renders Cache N/A on line 3 when cacheHitPct is null', () => {
    const output = render(baseCtx);
    const line3 = output.split('\n')[2];
    assert.ok(line3.includes('Cache N/A'));
  });
});

describe('makeBar ANSI colors', () => {
  it('wraps bar in green when pct is 0 (below 60%)', () => {
    const result = makeBar(0);
    assert.ok(result.startsWith(GREEN), `expected green prefix, got: ${JSON.stringify(result)}`);
    assert.ok(result.endsWith(RESET), `expected reset suffix, got: ${JSON.stringify(result)}`);
    assert.ok(stripAnsi(result) === '░░░░░░░░░░', `expected 10 empty blocks, got: ${JSON.stringify(stripAnsi(result))}`);
  });

  it('wraps bar in green when pct is 59 (just below yellow threshold)', () => {
    const result = makeBar(59);
    assert.ok(result.startsWith(GREEN), `expected green prefix, got: ${JSON.stringify(result)}`);
    assert.ok(result.endsWith(RESET), `expected reset suffix, got: ${JSON.stringify(result)}`);
    assert.ok(!result.includes(YELLOW), `must not include yellow, got: ${JSON.stringify(result)}`);
    assert.ok(!result.includes(RED), `must not include red, got: ${JSON.stringify(result)}`);
  });

  it('wraps bar in yellow when pct is 60 (at yellow threshold)', () => {
    const result = makeBar(60);
    assert.ok(result.startsWith(YELLOW), `expected yellow prefix, got: ${JSON.stringify(result)}`);
    assert.ok(result.endsWith(RESET), `expected reset suffix, got: ${JSON.stringify(result)}`);
    assert.ok(!result.includes(GREEN), `must not include green, got: ${JSON.stringify(result)}`);
    assert.ok(!result.includes(RED), `must not include red, got: ${JSON.stringify(result)}`);
  });

  it('wraps bar in yellow when pct is 80 (at boundary between yellow and red)', () => {
    const result = makeBar(80);
    assert.ok(result.startsWith(YELLOW), `expected yellow prefix, got: ${JSON.stringify(result)}`);
    assert.ok(result.endsWith(RESET), `expected reset suffix, got: ${JSON.stringify(result)}`);
    assert.ok(!result.includes(GREEN), `must not include green, got: ${JSON.stringify(result)}`);
    assert.ok(!result.includes(RED), `must not include red, got: ${JSON.stringify(result)}`);
  });

  it('wraps bar in red when pct is 81 (just above red threshold)', () => {
    const result = makeBar(81);
    assert.ok(result.startsWith(RED), `expected red prefix, got: ${JSON.stringify(result)}`);
    assert.ok(result.endsWith(RESET), `expected reset suffix, got: ${JSON.stringify(result)}`);
    assert.ok(!result.includes(GREEN), `must not include green, got: ${JSON.stringify(result)}`);
    assert.ok(!result.includes(YELLOW), `must not include yellow, got: ${JSON.stringify(result)}`);
  });

  it('wraps bar in red when pct is 100 (maximum)', () => {
    const result = makeBar(100);
    assert.ok(result.startsWith(RED), `expected red prefix, got: ${JSON.stringify(result)}`);
    assert.ok(result.endsWith(RESET), `expected reset suffix, got: ${JSON.stringify(result)}`);
    assert.ok(stripAnsi(result) === '██████████', `expected 10 filled blocks, got: ${JSON.stringify(stripAnsi(result))}`);
  });

  it('always ends with ANSI reset code to prevent terminal color bleed', () => {
    for (const pct of [0, 30, 59, 60, 70, 80, 81, 100]) {
      const result = makeBar(pct);
      assert.ok(result.endsWith(RESET), `makeBar(${pct}) must end with reset code \\x1b[0m, got: ${JSON.stringify(result)}`);
    }
  });
});

describe('render() ANSI output', () => {
  it('render() output contains at least one ANSI escape sequence', () => {
    const output = render(withRateLimits);
    assert.ok(output.includes('\x1b['), `expected ANSI escape sequence in render output, got: ${JSON.stringify(output)}`);
  });

  it('render() output contains green ANSI code for low-usage bars', () => {
    // five_hour: 40% → green, seven_day: 70% → yellow
    const output = render(withRateLimits);
    assert.ok(output.includes(GREEN), `expected green ANSI \\x1b[32m for session bar at 40%, got: ${JSON.stringify(output)}`);
  });

  it('render() output contains yellow ANSI code for medium-usage bars', () => {
    // seven_day: 70% → yellow
    const output = render(withRateLimits);
    assert.ok(output.includes(YELLOW), `expected yellow ANSI \\x1b[33m for weekly bar at 70%, got: ${JSON.stringify(output)}`);
  });

  it('render() output contains red ANSI code when a bar exceeds 80%', () => {
    const highUsageCtx: RenderContext = {
      ...baseCtx,
      rateLimits: {
        five_hour: { used_percentage: 90 },
        seven_day: { used_percentage: 85 },
      },
    };
    const output = render(highUsageCtx);
    assert.ok(output.includes(RED), `expected red ANSI \\x1b[31m for bars above 80%, got: ${JSON.stringify(output)}`);
  });

  it('render() output contains ANSI reset code after every colored bar segment', () => {
    const output = render(withRateLimits);
    assert.ok(output.includes(RESET), `expected ANSI reset \\x1b[0m in render output, got: ${JSON.stringify(output)}`);
  });

  it('context bar in render() output is also color-coded with ANSI', () => {
    // ctxPct: 30 → green
    const output = render(baseCtx);
    // The Cxt bar segment should contain a green code wrapping the bar
    const cxtSegmentStart = output.indexOf('🗯 Cxt [');
    assert.ok(cxtSegmentStart !== -1, 'expected 🗯 Cxt [ in output');
    const cxtSegment = output.slice(cxtSegmentStart);
    assert.ok(cxtSegment.includes(GREEN), `expected green ANSI in Cxt bar segment (ctxPct=30), got: ${JSON.stringify(cxtSegment)}`);
  });
});

describe('render() session cost', () => {
  it('renders Session: $0.00 on line 3 when sessionCost is 0', () => {
    const ctx: RenderContext = { ...baseCtx, sessionCost: 0 };
    const line3 = render(ctx).split('\n')[2];
    assert.ok(stripAnsi(line3).includes('Session: $0.00'), `expected "Session: $0.00" in line 3, got: ${JSON.stringify(stripAnsi(line3))}`);
  });

  it('renders Session: $1.23 on line 3 when sessionCost is 1.23', () => {
    const ctx: RenderContext = { ...baseCtx, sessionCost: 1.23 };
    const line3 = render(ctx).split('\n')[2];
    assert.ok(stripAnsi(line3).includes('Session: $1.23'), `expected "Session: $1.23" in line 3, got: ${JSON.stringify(stripAnsi(line3))}`);
  });

  it('renders Session: $X.XX before API Est: on line 3', () => {
    const ctx: RenderContext = { ...baseCtx, sessionCost: 1.23 };
    const line3 = stripAnsi(render(ctx).split('\n')[2]);
    const sessionIdx = line3.indexOf('Session:');
    const apiEstIdx = line3.indexOf('API Est:');
    assert.ok(sessionIdx !== -1, `expected "Session:" in line 3, got: ${JSON.stringify(line3)}`);
    assert.ok(apiEstIdx !== -1, `expected "API Est:" in line 3, got: ${JSON.stringify(line3)}`);
    assert.ok(sessionIdx < apiEstIdx, `expected "Session:" to appear before "API Est:", got: ${JSON.stringify(line3)}`);
  });
});

describe('buildRenderContext() session cost', () => {
  const baseInput = {
    workspace: { current_dir: '/home/user/my-project' },
    model: { id: 'claude-sonnet-4-6', display_name: 'Sonnet 4.6' },
    context_window: { context_window_size: 200000, total_input_tokens: 60000 },
    rate_limits: undefined,
  };

  const baseGitInfo = { branchLabel: '', uncommittedCount: 0, committedCount: 0 };

  it('sets sessionCost from cost.total_cost_usd when present', () => {
    const input = { ...baseInput, cost: { total_cost_usd: 2.5, total_lines_added: 0, total_lines_removed: 0 } };
    const ctx = buildRenderContext(input, baseGitInfo, 10);
    assert.strictEqual(ctx.sessionCost, 2.5);
  });

  it('sets sessionCost to 0 when cost is absent', () => {
    const ctx = buildRenderContext(baseInput, baseGitInfo, 10);
    assert.strictEqual(ctx.sessionCost, 0);
  });

  it('sets sessionCost to 0 when cost.total_cost_usd is undefined', () => {
    const input = { ...baseInput, cost: { total_lines_added: 5, total_lines_removed: 2 } };
    const ctx = buildRenderContext(input, baseGitInfo, 10);
    assert.strictEqual(ctx.sessionCost, 0);
  });
});

describe('formatCountdown(resetsAt)', () => {
  it('returns "1h23m" when resetsAt is 83 minutes in the future', () => {
    // Use regex to allow ±1 min timing variance: match 1h2Xm pattern
    const resetsAt = new Date(Date.now() + 83 * 60 * 1000).toISOString();
    const result = formatCountdown(resetsAt);
    assert.match(result, /^1h2\dm$/, `expected "1h2Xm" format for 83-min future, got: ${JSON.stringify(result)}`);
  });

  it('returns "45m" when resetsAt is 45 minutes in the future', () => {
    // Allow ±1 min: match 44m or 45m
    const resetsAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    const result = formatCountdown(resetsAt);
    assert.match(result, /^(44|45)m$/, `expected "44m" or "45m" for 45-min future, got: ${JSON.stringify(result)}`);
  });

  it('returns "<1m" when resetsAt is 30 seconds in the future', () => {
    const resetsAt = new Date(Date.now() + 30 * 1000).toISOString();
    const result = formatCountdown(resetsAt);
    assert.strictEqual(result, '<1m', `expected "<1m" for 30-second future, got: ${JSON.stringify(result)}`);
  });

  it('returns "<1m" when resetsAt is an already-expired timestamp', () => {
    const resetsAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = formatCountdown(resetsAt);
    assert.strictEqual(result, '<1m', `expected "<1m" for expired timestamp, got: ${JSON.stringify(result)}`);
  });

  it('returns "??m" when resetsAt is undefined', () => {
    const result = formatCountdown(undefined);
    assert.strictEqual(result, '??m', `expected "??m" for undefined, got: ${JSON.stringify(result)}`);
  });

  it('returns "??m" when resetsAt is an invalid date string', () => {
    const result = formatCountdown('not-a-date');
    assert.strictEqual(result, '??m', `expected "??m" for invalid date string, got: ${JSON.stringify(result)}`);
  });

  it('never throws for any input value', () => {
    assert.doesNotThrow(() => formatCountdown(undefined));
    assert.doesNotThrow(() => formatCountdown('not-a-date'));
    assert.doesNotThrow(() => formatCountdown(''));
    assert.doesNotThrow(() => formatCountdown(new Date(Date.now() + 60 * 60 * 1000).toISOString()));
  });
});

describe('render() line 2 session segment uses countdown format (not percentage)', () => {
  it('line 2 session segment contains countdown string, not a bare percentage', () => {
    const resetsAt = new Date(Date.now() + 83 * 60 * 1000).toISOString();
    const ctx: RenderContext = {
      ...baseCtx,
      rateLimits: {
        five_hour: { used_percentage: 40, resets_at: resetsAt },
        seven_day: { used_percentage: 70 },
      },
    };
    const output = render(ctx);
    const line2 = output.split('\n')[1];
    // Should contain a countdown like "1h23m" or "Xhxxm", NOT the bare "40%"
    assert.ok(/\d+h\d+m/.test(line2) || /\d+m/.test(line2), `expected countdown format (e.g. 1h23m) in line 2 session segment, got: ${JSON.stringify(line2)}`);
    assert.ok(!line2.includes('] 40%'), `expected line 2 NOT to contain "] 40%" percentage format, got: ${JSON.stringify(line2)}`);
  });

  it('line 2 session segment shows ??m when resets_at is absent', () => {
    const ctx: RenderContext = {
      ...baseCtx,
      rateLimits: {
        five_hour: { used_percentage: 40 },
        seven_day: { used_percentage: 70 },
      },
    };
    const output = render(ctx);
    const line2 = output.split('\n')[1];
    assert.ok(line2.includes('??m'), `expected "??m" in line 2 when five_hour.resets_at is absent, got: ${JSON.stringify(line2)}`);
  });
});

describe('render() line 3 weekly segment uses countdown format (not percentage)', () => {
  it('line 3 weekly segment contains countdown string, not a bare percentage', () => {
    const resetsAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    const ctx: RenderContext = {
      ...baseCtx,
      rateLimits: {
        five_hour: { used_percentage: 40 },
        seven_day: { used_percentage: 70, resets_at: resetsAt },
      },
    };
    const output = render(ctx);
    const line3 = output.split('\n')[2];
    // Should contain a countdown like "45m", NOT the bare "70%"
    assert.ok(/\d+m/.test(line3), `expected countdown format (e.g. 45m) in line 3 weekly segment, got: ${JSON.stringify(line3)}`);
    assert.ok(!line3.includes('] 70%'), `expected line 3 NOT to contain "] 70%" percentage format, got: ${JSON.stringify(line3)}`);
  });

  it('line 3 weekly segment shows ??m when resets_at is absent', () => {
    const ctx: RenderContext = {
      ...baseCtx,
      rateLimits: {
        five_hour: { used_percentage: 40 },
        seven_day: { used_percentage: 70 },
      },
    };
    const output = render(ctx);
    const line3 = output.split('\n')[2];
    assert.ok(line3.includes('??m'), `expected "??m" in line 3 when seven_day.resets_at is absent, got: ${JSON.stringify(line3)}`);
  });
});

describe('calcCacheHitPct(current_usage)', () => {
  it('returns 80 when cache_creation=2000 and cache_read=8000', () => {
    assert.strictEqual(
      calcCacheHitPct({
        cache_creation_input_tokens: 2000,
        cache_read_input_tokens: 8000,
      }),
      80,
    );
  });

  it('returns null when both cache_creation and cache_read are 0', () => {
    assert.strictEqual(
      calcCacheHitPct({
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      }),
      null,
    );
  });

  it('returns 0 when only cache_creation=5000 and cache_read=0', () => {
    assert.strictEqual(
      calcCacheHitPct({
        cache_creation_input_tokens: 5000,
        cache_read_input_tokens: 0,
      }),
      0,
    );
  });

  it('returns null when current_usage is null', () => {
    assert.strictEqual(calcCacheHitPct(null), null);
  });

  it('returns null when current_usage is undefined', () => {
    assert.strictEqual(calcCacheHitPct(undefined), null);
  });
});
