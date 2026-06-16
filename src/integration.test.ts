import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './render';
import { buildRenderContext } from './context';
import type { RenderContext, StatuslineConfig, InputJSON, GitInfo } from './types';

// ANSI escape codes
const ANSI_START = '\x1b[';
const ANSI_RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function disableFeature(key: keyof StatuslineConfig['features']): StatuslineConfig {
  return {
    ...fullConfig,
    features: { ...fullConfig.features, [key]: false },
  };
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const fullCtx: RenderContext = {
  projectName: 'aurora-statusline',
  model: 'sonnet-4-6',
  git: { branchLabel: '🌱 feat/integration', uncommittedCount: 3, committedCount: 7 },
  ctxBar: '████░░░░░░',
  ctxPct: 40,
  added: 50,
  removed: 10,
  monthlyCost: 12.34,
  sessionCost: 1.5,
  rateLimits: {
    five_hour: { used_percentage: 45 },
    seven_day: { used_percentage: 72 },
  },
  cacheHitPct: 65,
};

const fullConfig: StatuslineConfig = {
  features: {
    git: true,
    contextWindow: true,
    rateLimits: true,
    cacheHit: true,
    sessionCost: true,
    monthlyCost: true,
    linesChanged: true,
  },
  display: {
    colorMode: 'ansi',
    barWidth: 10,
  },
};

// ─── 1. Segment presence ──────────────────────────────────────────────────────

describe('integration: segment presence with full config', () => {
  const output = render(fullCtx, fullConfig);
  const [line1, line2raw, line3raw] = output.split('\n');
  const line2 = stripAnsi(line2raw);
  const line3 = stripAnsi(line3raw);

  it('line 1 contains projectName, model, branchLabel, uncommittedCount, committedCount', () => {
    assert.ok(line1.includes('📁 aurora-statusline'), `expected projectName in line 1, got: ${JSON.stringify(line1)}`);
    assert.ok(line1.includes('sonnet-4-6'), `expected model in line 1, got: ${JSON.stringify(line1)}`);
    assert.ok(line1.includes('🌱 feat/integration'), `expected branchLabel in line 1, got: ${JSON.stringify(line1)}`);
    assert.ok(line1.includes('UnCommit: 3'), `expected uncommittedCount in line 1, got: ${JSON.stringify(line1)}`);
    assert.ok(line1.includes('Commited: 7'), `expected committedCount in line 1, got: ${JSON.stringify(line1)}`);
  });

  it('line 2 contains session bar, context window bar, and linesChanged', () => {
    assert.ok(line2.includes('💬 Session ['), `expected session bar segment in line 2, got: ${JSON.stringify(line2)}`);
    assert.ok(line2.includes('] 45%'), `expected session bar pct in line 2, got: ${JSON.stringify(line2)}`);
    assert.ok(line2.includes('🗯 Cxt ['), `expected context bar segment in line 2, got: ${JSON.stringify(line2)}`);
    assert.ok(line2.includes('] 40%'), `expected ctx pct in line 2, got: ${JSON.stringify(line2)}`);
    assert.ok(line2.includes('+50 -10'), `expected linesChanged in line 2, got: ${JSON.stringify(line2)}`);
  });

  it('line 3 contains weekly bar, cacheHit, sessionCost, and monthlyCost', () => {
    assert.ok(line3.includes('📅 Weekly ['), `expected weekly bar segment in line 3, got: ${JSON.stringify(line3)}`);
    assert.ok(line3.includes('] 72%'), `expected weekly pct in line 3, got: ${JSON.stringify(line3)}`);
    assert.ok(line3.includes('Cache 65%'), `expected cacheHit in line 3, got: ${JSON.stringify(line3)}`);
    assert.ok(line3.includes('Session: $1.50'), `expected sessionCost in line 3, got: ${JSON.stringify(line3)}`);
    assert.ok(line3.includes('API Est: $12.34/mth'), `expected monthlyCost in line 3, got: ${JSON.stringify(line3)}`);
  });

  it('full output has exactly 3 lines', () => {
    const lines = output.split('\n');
    assert.strictEqual(lines.length, 3, `expected 3 lines, got: ${lines.length}`);
  });
});

// ─── 2. ANSI format ───────────────────────────────────────────────────────────

describe('integration: ANSI color format validation', () => {
  const output = render(fullCtx, fullConfig);
  const [, line2, line3] = output.split('\n');

  it('output contains ANSI escape sequence opening \\x1b[', () => {
    assert.ok(output.includes(ANSI_START), `expected ANSI escape sequence in output, got: ${JSON.stringify(output)}`);
  });

  it('output contains ANSI reset \\x1b[0m to terminate color sequences', () => {
    assert.ok(output.includes(ANSI_RESET), `expected ANSI reset code \\x1b[0m in output, got: ${JSON.stringify(output)}`);
  });

  it('every ANSI color code is followed by a reset within the output (no color bleed)', () => {
    const colorOpenings = (output.match(/\x1b\[(?:3[123]|0)m/g) ?? []).filter(c => c !== ANSI_RESET).length;
    const resets = (output.match(/\x1b\[0m/g) ?? []).length;
    assert.ok(resets >= colorOpenings, `expected at least ${colorOpenings} reset codes for ${colorOpenings} color openings, got ${resets} resets`);
  });

  it('session bar at 45% uses green color code \\x1b[32m', () => {
    const sessionIdx = line2.indexOf('💬 Session [');
    const segment = line2.slice(sessionIdx);
    assert.ok(segment.includes(GREEN), `expected green \\x1b[32m for 45% session bar, got: ${JSON.stringify(segment)}`);
  });

  it('weekly bar at 72% uses yellow color code \\x1b[33m', () => {
    const weeklyIdx = line3.indexOf('📅 Weekly [');
    const segment = line3.slice(weeklyIdx);
    assert.ok(segment.includes(YELLOW), `expected yellow \\x1b[33m for 72% weekly bar, got: ${JSON.stringify(segment)}`);
  });

  it('a bar above 80% uses red color code \\x1b[31m', () => {
    const highCtx: RenderContext = {
      ...fullCtx,
      rateLimits: {
        five_hour: { used_percentage: 90 },
        seven_day: { used_percentage: 85 },
      },
    };
    const highOutput = render(highCtx, fullConfig);
    assert.ok(highOutput.includes(RED), `expected red \\x1b[31m for bar above 80%, got: ${JSON.stringify(highOutput)}`);
  });

  it('context bar segment starts with ANSI escape and ends with ANSI reset', () => {
    const match = output.match(/🗯 Cxt \[(\x1b\[.*?\x1b\[0m)\]/);
    assert.ok(match !== null, `expected 🗯 Cxt [<ansi-bar>] pattern in output, got: ${JSON.stringify(output)}`);
    const barContent = match[1];
    assert.ok(barContent.startsWith(ANSI_START), `bar must start with \\x1b[, got: ${JSON.stringify(barContent)}`);
    assert.ok(barContent.endsWith(ANSI_RESET), `bar must end with \\x1b[0m, got: ${JSON.stringify(barContent)}`);
  });
});

// ─── 3. Feature toggles ───────────────────────────────────────────────────────

describe('integration: feature toggle — sessionCost: false removes cost segment', () => {
  const config = disableFeature('sessionCost');
  const output = render(fullCtx, config);
  const stripped = stripAnsi(output);

  it('Session: $X.XX does not appear in output when sessionCost feature is disabled', () => {
    assert.ok(!stripped.includes('Session: $'), `expected "Session: $" to be absent when sessionCost=false, got: ${JSON.stringify(stripped)}`);
  });

  it('other line 3 segments still appear when sessionCost is the only disabled feature', () => {
    const line3 = stripAnsi(output.split('\n')[2]);
    assert.ok(line3.includes('API Est: $12.34/mth'), `expected monthlyCost to remain when only sessionCost=false, got: ${JSON.stringify(line3)}`);
    assert.ok(line3.includes('Cache 65%'), `expected cacheHit to remain when only sessionCost=false, got: ${JSON.stringify(line3)}`);
  });
});

describe('integration: feature toggle — git: false removes git segments from line 1', () => {
  const config = disableFeature('git');
  const output = render(fullCtx, config);
  const line1 = output.split('\n')[0];

  it('branchLabel does not appear in line 1 when git feature is disabled', () => {
    assert.ok(!line1.includes('🌱 feat/integration'), `expected branchLabel to be absent when git=false, got: ${JSON.stringify(line1)}`);
  });

  it('UnCommit and Commited counts do not appear in line 1 when git feature is disabled', () => {
    assert.ok(!line1.includes('UnCommit:'), `expected "UnCommit:" to be absent when git=false, got: ${JSON.stringify(line1)}`);
    assert.ok(!line1.includes('Commited:'), `expected "Commited:" to be absent when git=false, got: ${JSON.stringify(line1)}`);
  });

  it('projectName and model still appear in line 1 when git feature is disabled', () => {
    assert.ok(line1.includes('📁 aurora-statusline'), `expected projectName to remain when git=false, got: ${JSON.stringify(line1)}`);
    assert.ok(line1.includes('sonnet-4-6'), `expected model to remain when git=false, got: ${JSON.stringify(line1)}`);
  });
});

describe('integration: feature toggle — contextWindow: false removes context bar from line 2', () => {
  it('🗯 Cxt segment does not appear in line 2 when contextWindow feature is disabled', () => {
    const config = disableFeature('contextWindow');
    const output = render(fullCtx, config);
    const line2 = output.split('\n')[1];
    assert.ok(!line2.includes('🗯 Cxt'), `expected "🗯 Cxt" to be absent when contextWindow=false, got: ${JSON.stringify(line2)}`);
  });
});

describe('integration: feature toggle — monthlyCost: false removes API Est segment from line 3', () => {
  it('API Est: $X.XX/mth does not appear in output when monthlyCost feature is disabled', () => {
    const config = disableFeature('monthlyCost');
    const output = render(fullCtx, config);
    assert.ok(!stripAnsi(output).includes('API Est:'), `expected "API Est:" to be absent when monthlyCost=false, got: ${JSON.stringify(stripAnsi(output))}`);
  });
});

// ─── 4. Integration flow: buildRenderContext → render ─────────────────────────

describe('integration: buildRenderContext → render full pipeline', () => {
  const inputJSON: InputJSON = {
    model: { id: 'claude-sonnet-4-6', display_name: 'Sonnet 4.6' },
    workspace: { current_dir: '/home/alex/projects/aurora-statusline' },
    session_id: 'test-session-001',
    context_window: {
      context_window_size: 200000,
      total_input_tokens: 80000,
      current_usage: {
        input_tokens: 70000,
        cache_creation_input_tokens: 5000,
        cache_read_input_tokens: 20000,
      },
    },
    rate_limits: {
      five_hour: { used_percentage: 35 },
      seven_day: { used_percentage: 65 },
    },
    cost: {
      total_cost_usd: 2.75,
      total_lines_added: 100,
      total_lines_removed: 20,
    },
  };

  const gitInfo: GitInfo = {
    branchLabel: '🌿 main',
    uncommittedCount: 1,
    committedCount: 5,
  };

  const monthlyCost = 45.0;

  const ctx = buildRenderContext(inputJSON, gitInfo, monthlyCost);

  it('buildRenderContext produces a RenderContext with correct projectName', () => {
    assert.strictEqual(ctx.projectName, 'aurora-statusline', `expected projectName "aurora-statusline", got: ${JSON.stringify(ctx.projectName)}`);
  });

  it('buildRenderContext produces a RenderContext with stripped model name', () => {
    assert.strictEqual(ctx.model, 'sonnet-4-6', `expected model "sonnet-4-6" (stripped claude- prefix), got: ${JSON.stringify(ctx.model)}`);
  });

  it('buildRenderContext produces a RenderContext with correct sessionCost', () => {
    assert.strictEqual(ctx.sessionCost, 2.75, `expected sessionCost 2.75, got: ${ctx.sessionCost}`);
  });

  it('buildRenderContext produces a RenderContext with non-null cacheHitPct', () => {
    // cache_read=20000, cache_creation=5000 → 20000/(20000+5000) = 80%
    assert.strictEqual(ctx.cacheHitPct, 80, `expected cacheHitPct 80, got: ${ctx.cacheHitPct}`);
  });

  it('render(buildRenderContext(...)) produces output containing all major segments', () => {
    const output = render(ctx, fullConfig);
    const stripped = stripAnsi(output);

    // Line 1 segments
    assert.ok(stripped.includes('📁 aurora-statusline'), `expected projectName in output, got: ${JSON.stringify(stripped)}`);
    assert.ok(stripped.includes('sonnet-4-6'), `expected model in output, got: ${JSON.stringify(stripped)}`);
    assert.ok(stripped.includes('🌿 main'), `expected branchLabel in output, got: ${JSON.stringify(stripped)}`);
    assert.ok(stripped.includes('UnCommit: 1'), `expected uncommittedCount in output, got: ${JSON.stringify(stripped)}`);
    assert.ok(stripped.includes('Commited: 5'), `expected committedCount in output, got: ${JSON.stringify(stripped)}`);

    // Line 2 segments
    assert.ok(stripped.includes('💬 Session ['), `expected session bar in output, got: ${JSON.stringify(stripped)}`);
    assert.ok(stripped.includes('🗯 Cxt ['), `expected ctx bar in output, got: ${JSON.stringify(stripped)}`);
    assert.ok(stripped.includes('+100 -20'), `expected linesChanged in output, got: ${JSON.stringify(stripped)}`);

    // Line 3 segments
    assert.ok(stripped.includes('Cache 80%'), `expected cacheHit in output, got: ${JSON.stringify(stripped)}`);
    assert.ok(stripped.includes('Session: $2.75'), `expected sessionCost in output, got: ${JSON.stringify(stripped)}`);
    assert.ok(stripped.includes('API Est: $45.00/mth'), `expected monthlyCost in output, got: ${JSON.stringify(stripped)}`);
  });

  it('render(buildRenderContext(...)) output contains ANSI escape sequences', () => {
    const output = render(ctx, fullConfig);
    assert.ok(output.includes(ANSI_START), `expected ANSI escape in full pipeline output, got: ${JSON.stringify(output)}`);
    assert.ok(output.includes(ANSI_RESET), `expected ANSI reset in full pipeline output, got: ${JSON.stringify(output)}`);
  });
});
