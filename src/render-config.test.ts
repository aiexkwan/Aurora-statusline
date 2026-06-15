import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render, makeBar } from './render.js';
import type { RenderContext, StatuslineConfig, StatuslineFeatures } from './types.js';

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

const testCtx: RenderContext = {
  projectName: 'test-project',
  model: 'opus-4-6',
  git: { branchLabel: '🌱 feature/test', uncommittedCount: 2, committedCount: 1 },
  ctxBar: makeBar(45),
  ctxPct: 45,
  added: 156,
  removed: 23,
  monthlyCost: 3.42,
  sessionCost: 0.12,
  rateLimits: { five_hour: { used_percentage: 35 }, seven_day: { used_percentage: 62 } },
  cacheHitPct: 75,
};

const allEnabled: StatuslineConfig = {
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

function withFeature(key: keyof StatuslineFeatures, value: false): StatuslineConfig {
  return {
    ...allEnabled,
    features: {
      ...allEnabled.features,
      [key]: value,
    },
  };
}

describe('render() backward compatibility', () => {
  it('renders 3 lines when called with no config', () => {
    const output = render(testCtx);
    const lines = output.split('\n');
    assert.strictEqual(lines.length, 3, `expected 3 lines, got ${lines.length}: ${JSON.stringify(output)}`);
  });

  it('includes all segments when called with no config', () => {
    const output = render(testCtx);
    assert.ok(output.includes('🌱'), `expected 🌱 in output`);
    assert.ok(output.includes('UnCommit:'), `expected UnCommit: in output`);
    assert.ok(output.includes('Commited:'), `expected Commited: in output`);
    assert.ok(output.includes('🗯 Cxt'), `expected 🗯 Cxt in output`);
    assert.ok(output.includes('Session ['), `expected Session [ in output`);
    assert.ok(output.includes('Weekly ['), `expected Weekly [ in output`);
    assert.ok(output.includes('🎯'), `expected 🎯 in output`);
    assert.ok(output.includes('Cache'), `expected Cache in output`);
    assert.ok(output.includes('Session: $'), `expected Session: $ in output`);
    assert.ok(output.includes('API Est:'), `expected API Est: in output`);
    assert.ok(output.includes('+156'), `expected +156 in output`);
    assert.ok(output.includes('-23'), `expected -23 in output`);
  });

  it('render(ctx, undefined) produces identical output to render(ctx)', () => {
    const withoutConfig = render(testCtx);
    const withUndefined = render(testCtx, undefined);
    assert.strictEqual(withoutConfig, withUndefined, 'render(ctx) and render(ctx, undefined) must produce identical output');
  });
});

describe('feature toggle: git: false', () => {
  it('excludes 🌱 from output', () => {
    const config = withFeature('git', false);
    const output = render(testCtx, config);
    assert.ok(!output.includes('🌱'), `expected no 🌱 when git=false, got: ${JSON.stringify(output)}`);
  });

  it('excludes UnCommit from output', () => {
    const config = withFeature('git', false);
    const output = render(testCtx, config);
    assert.ok(!output.includes('UnCommit'), `expected no UnCommit when git=false, got: ${JSON.stringify(output)}`);
  });

  it('excludes Commited from output', () => {
    const config = withFeature('git', false);
    const output = render(testCtx, config);
    assert.ok(!output.includes('Commited'), `expected no Commited when git=false, got: ${JSON.stringify(output)}`);
  });

  it('other segments still present when git=false', () => {
    const config = withFeature('git', false);
    const output = render(testCtx, config);
    assert.ok(output.includes('🗯 Cxt'), `expected 🗯 Cxt still present when git=false`);
    assert.ok(output.includes('API Est:'), `expected API Est: still present when git=false`);
  });
});

describe('feature toggle: contextWindow: false', () => {
  it('excludes 🗯 Cxt from output', () => {
    const config = withFeature('contextWindow', false);
    const output = render(testCtx, config);
    assert.ok(!output.includes('🗯 Cxt'), `expected no 🗯 Cxt when contextWindow=false, got: ${JSON.stringify(output)}`);
  });

  it('other segments still present when contextWindow=false', () => {
    const config = withFeature('contextWindow', false);
    const output = render(testCtx, config);
    assert.ok(output.includes('🌱'), `expected 🌱 still present when contextWindow=false`);
    assert.ok(output.includes('API Est:'), `expected API Est: still present when contextWindow=false`);
  });
});

describe('feature toggle: rateLimits: false', () => {
  it('excludes Session [ from output', () => {
    const config = withFeature('rateLimits', false);
    const output = render(testCtx, config);
    assert.ok(!output.includes('Session ['), `expected no "Session [" when rateLimits=false, got: ${JSON.stringify(output)}`);
  });

  it('excludes Weekly [ from output', () => {
    const config = withFeature('rateLimits', false);
    const output = render(testCtx, config);
    assert.ok(!output.includes('Weekly ['), `expected no "Weekly [" when rateLimits=false, got: ${JSON.stringify(output)}`);
  });

  it('other segments still present when rateLimits=false', () => {
    const config = withFeature('rateLimits', false);
    const output = render(testCtx, config);
    assert.ok(output.includes('🌱'), `expected 🌱 still present when rateLimits=false`);
    assert.ok(output.includes('🗯 Cxt'), `expected 🗯 Cxt still present when rateLimits=false`);
  });
});

describe('feature toggle: cacheHit: false', () => {
  it('excludes 🎯 from output', () => {
    const config = withFeature('cacheHit', false);
    const output = render(testCtx, config);
    assert.ok(!output.includes('🎯'), `expected no 🎯 when cacheHit=false, got: ${JSON.stringify(output)}`);
  });

  it('excludes Cache from output', () => {
    const config = withFeature('cacheHit', false);
    const output = render(testCtx, config);
    assert.ok(!output.includes('Cache'), `expected no Cache when cacheHit=false, got: ${JSON.stringify(output)}`);
  });

  it('other segments still present when cacheHit=false', () => {
    const config = withFeature('cacheHit', false);
    const output = render(testCtx, config);
    assert.ok(output.includes('🌱'), `expected 🌱 still present when cacheHit=false`);
    assert.ok(output.includes('API Est:'), `expected API Est: still present when cacheHit=false`);
  });
});

describe('feature toggle: sessionCost: false', () => {
  it('excludes Session: $ from output', () => {
    const config = withFeature('sessionCost', false);
    const output = render(testCtx, config);
    assert.ok(!output.includes('Session: $'), `expected no "Session: $" when sessionCost=false, got: ${JSON.stringify(output)}`);
  });

  it('other segments still present when sessionCost=false', () => {
    const config = withFeature('sessionCost', false);
    const output = render(testCtx, config);
    assert.ok(output.includes('API Est:'), `expected API Est: still present when sessionCost=false`);
    assert.ok(output.includes('🌱'), `expected 🌱 still present when sessionCost=false`);
  });
});

describe('feature toggle: monthlyCost: false', () => {
  it('excludes API Est: from output', () => {
    const config = withFeature('monthlyCost', false);
    const output = render(testCtx, config);
    assert.ok(!output.includes('API Est:'), `expected no "API Est:" when monthlyCost=false, got: ${JSON.stringify(output)}`);
  });

  it('other segments still present when monthlyCost=false', () => {
    const config = withFeature('monthlyCost', false);
    const output = render(testCtx, config);
    assert.ok(output.includes('🌱'), `expected 🌱 still present when monthlyCost=false`);
    assert.ok(output.includes('Session: $'), `expected "Session: $" still present when monthlyCost=false`);
  });
});

describe('feature toggle: linesChanged: false', () => {
  it('excludes +156 from output', () => {
    const config = withFeature('linesChanged', false);
    const output = render(testCtx, config);
    assert.ok(!output.includes('+156'), `expected no "+156" when linesChanged=false, got: ${JSON.stringify(output)}`);
  });

  it('excludes -23 from output', () => {
    const config = withFeature('linesChanged', false);
    const output = render(testCtx, config);
    assert.ok(!output.includes('-23'), `expected no "-23" when linesChanged=false, got: ${JSON.stringify(output)}`);
  });

  it('other segments still present when linesChanged=false', () => {
    const config = withFeature('linesChanged', false);
    const output = render(testCtx, config);
    assert.ok(output.includes('🌱'), `expected 🌱 still present when linesChanged=false`);
    assert.ok(output.includes('🗯 Cxt'), `expected 🗯 Cxt still present when linesChanged=false`);
    assert.ok(output.includes('API Est:'), `expected API Est: still present when linesChanged=false`);
  });
});

describe('colorMode plain on render()', () => {
  const plainConfig: StatuslineConfig = {
    ...allEnabled,
    display: { colorMode: 'plain', barWidth: 10 },
  };

  it('output contains no ANSI escape codes when colorMode=plain', () => {
    const output = render(testCtx, plainConfig);
    assert.ok(!output.includes('\x1b['), `expected no ANSI escape codes when colorMode=plain, got: ${JSON.stringify(output)}`);
  });

  it('output still contains 📁 emoji when colorMode=plain', () => {
    const output = render(testCtx, plainConfig);
    assert.ok(output.includes('📁'), `expected 📁 emoji preserved when colorMode=plain`);
  });

  it('output still contains 🗯 emoji when colorMode=plain', () => {
    const output = render(testCtx, plainConfig);
    assert.ok(output.includes('🗯'), `expected 🗯 emoji preserved when colorMode=plain`);
  });

  it('output still contains 📅 emoji when colorMode=plain', () => {
    const output = render(testCtx, plainConfig);
    assert.ok(output.includes('📅'), `expected 📅 emoji preserved when colorMode=plain`);
  });

  it('output still contains 🎯 emoji when colorMode=plain', () => {
    const output = render(testCtx, plainConfig);
    assert.ok(output.includes('🎯'), `expected 🎯 emoji preserved when colorMode=plain`);
  });
});

describe('makeBar() custom width', () => {
  it('stripped bar characters length equals 15 when width=15', () => {
    const bar = makeBar(50, 15);
    const stripped = stripAnsi(bar);
    const barChars = stripped.replace(/[^█░]/g, '');
    assert.strictEqual(barChars.length, 15, `expected 15 bar chars with width=15, got ${barChars.length}: ${JSON.stringify(stripped)}`);
  });

  it('stripped bar characters length equals 5 when width=5', () => {
    const bar = makeBar(50, 5);
    const stripped = stripAnsi(bar);
    const barChars = stripped.replace(/[^█░]/g, '');
    assert.strictEqual(barChars.length, 5, `expected 5 bar chars with width=5, got ${barChars.length}: ${JSON.stringify(stripped)}`);
  });

  it('stripped bar characters length equals 20 when width=20', () => {
    const bar = makeBar(50, 20);
    const stripped = stripAnsi(bar);
    const barChars = stripped.replace(/[^█░]/g, '');
    assert.strictEqual(barChars.length, 20, `expected 20 bar chars with width=20, got ${barChars.length}: ${JSON.stringify(stripped)}`);
  });

  it('stripped bar characters length equals 10 when no width provided (default)', () => {
    const bar = makeBar(50);
    const stripped = stripAnsi(bar);
    const barChars = stripped.replace(/[^█░]/g, '');
    assert.strictEqual(barChars.length, 10, `expected 10 bar chars with default width, got ${barChars.length}: ${JSON.stringify(stripped)}`);
  });
});

describe("makeBar() colorMode 'plain'", () => {
  it('makeBar(50, 10, plain) contains no ANSI escape codes', () => {
    const bar = makeBar(50, 10, 'plain');
    assert.ok(!bar.includes('\x1b['), `expected no ANSI escape codes when colorMode=plain, got: ${JSON.stringify(bar)}`);
  });

  it('makeBar(50, 10, plain) still contains bar characters', () => {
    const bar = makeBar(50, 10, 'plain');
    const barChars = bar.replace(/[^█░]/g, '');
    assert.ok(barChars.length > 0, `expected bar chars in plain mode, got: ${JSON.stringify(bar)}`);
  });
});
