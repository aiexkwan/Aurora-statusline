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
    assert.ok(output.includes('🗯 Ctx Win'), `expected 🗯 Ctx Win in output`);
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
    assert.ok(output.includes('🗯 Ctx Win'), `expected 🗯 Ctx Win still present when git=false`);
    assert.ok(output.includes('API Est:'), `expected API Est: still present when git=false`);
  });
});

describe('feature toggle: contextWindow: false', () => {
  it('excludes 🗯 Ctx Win from output', () => {
    const config = withFeature('contextWindow', false);
    const output = render(testCtx, config);
    assert.ok(!output.includes('🗯 Ctx Win'), `expected no 🗯 Ctx Win when contextWindow=false, got: ${JSON.stringify(output)}`);
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
    assert.ok(output.includes('🗯 Ctx Win'), `expected 🗯 Ctx Win still present when rateLimits=false`);
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
    assert.ok(output.includes('🗯 Ctx Win'), `expected 🗯 Ctx Win still present when linesChanged=false`);
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

type ExtendedRenderContext = RenderContext & { reasoningEffort?: string | null };

function ctxWithEffort(effort: string | null): RenderContext {
  const extended: ExtendedRenderContext = { ...testCtx, reasoningEffort: effort };
  return extended as unknown as RenderContext;
}

function configWithReasoningEffort(value: boolean): StatuslineConfig {
  const features = { ...allEnabled.features } as StatuslineFeatures & { reasoningEffort?: boolean };
  features.reasoningEffort = value;
  return { ...allEnabled, features: features as StatuslineFeatures };
}

describe('feature toggle: reasoningEffort — effort.level present', () => {
  it('Line 1 contains "⚡ high" when reasoningEffort context is "high"', () => {
    const ctx = ctxWithEffort('high');
    const line1 = stripAnsi(render(ctx).split('\n')[0]);
    assert.ok(line1.includes('⚡ high'), `expected "⚡ high" in Line 1, got: ${JSON.stringify(line1)}`);
  });

  it('Line 1 segment is separated by " | " from adjacent segments', () => {
    const ctx = ctxWithEffort('high');
    const line1 = stripAnsi(render(ctx).split('\n')[0]);
    assert.ok(line1.includes(' | ⚡ high') || line1.includes('⚡ high | '), `expected "⚡ high" surrounded by " | " separators, got: ${JSON.stringify(line1)}`);
  });
});

describe('feature toggle: reasoningEffort — thinking.effort fallback', () => {
  it('Line 1 contains "⚡ medium" when reasoningEffort context is "medium"', () => {
    const ctx = ctxWithEffort('medium');
    const line1 = stripAnsi(render(ctx).split('\n')[0]);
    assert.ok(line1.includes('⚡ medium'), `expected "⚡ medium" in Line 1, got: ${JSON.stringify(line1)}`);
  });
});

describe('feature toggle: reasoningEffort — absent (null)', () => {
  it('Line 1 does not contain "⚡" when reasoningEffort context is null', () => {
    const ctx = ctxWithEffort(null);
    const line1 = stripAnsi(render(ctx).split('\n')[0]);
    assert.ok(!line1.includes('⚡'), `expected no "⚡" in Line 1 when reasoningEffort is null, got: ${JSON.stringify(line1)}`);
  });

  it('Line 1 does not contain "⚡" when testCtx has no reasoningEffort field', () => {
    const line1 = stripAnsi(render(testCtx).split('\n')[0]);
    assert.ok(!line1.includes('⚡'), `expected no "⚡" in baseline Line 1, got: ${JSON.stringify(line1)}`);
  });
});

describe('feature toggle: reasoningEffort: false — toggle disabled', () => {
  it('Line 1 does not contain "⚡" when reasoningEffort toggle is false even if context has value', () => {
    const ctx = ctxWithEffort('high');
    const config = configWithReasoningEffort(false);
    const line1 = stripAnsi(render(ctx, config).split('\n')[0]);
    assert.ok(!line1.includes('⚡'), `expected no "⚡" when reasoningEffort=false, got: ${JSON.stringify(line1)}`);
  });

  it('other Line 1 segments still present when reasoningEffort=false', () => {
    const ctx = ctxWithEffort('high');
    const config = configWithReasoningEffort(false);
    const line1 = stripAnsi(render(ctx, config).split('\n')[0]);
    assert.ok(line1.includes('📁'), `expected 📁 still present when reasoningEffort=false`);
    assert.ok(line1.includes('opus-4-6'), `expected model name still present when reasoningEffort=false`);
  });
});

type ExtendedRenderContextWithAgent = RenderContext & { agentName?: string | null };

function ctxWithAgentName(name: string | null): RenderContext {
  const extended: ExtendedRenderContextWithAgent = { ...testCtx, agentName: name };
  return extended as unknown as RenderContext;
}

function configWithAgentName(value: boolean): StatuslineConfig {
  const features = { ...allEnabled.features } as StatuslineFeatures & { agentName?: boolean };
  features.agentName = value;
  return { ...allEnabled, features: features as StatuslineFeatures };
}

describe('feature: agentName — name present', () => {
  it('Line 1 contains "🤖 Explore" when agentName context is "Explore"', () => {
    const ctx = ctxWithAgentName('Explore');
    const line1 = stripAnsi(render(ctx).split('\n')[0]);
    assert.ok(line1.includes('🤖 Explore'), `expected "🤖 Explore" in Line 1, got: ${JSON.stringify(line1)}`);
  });

  it('Line 1 segment "🤖 Explore" is separated by " | " from adjacent segments', () => {
    const ctx = ctxWithAgentName('Explore');
    const line1 = stripAnsi(render(ctx).split('\n')[0]);
    assert.ok(line1.includes(' | 🤖 Explore') || line1.includes('🤖 Explore | '), `expected "🤖 Explore" surrounded by " | " separators, got: ${JSON.stringify(line1)}`);
  });
});

describe('feature: agentName — name absent (null)', () => {
  it('Line 1 does not contain "🤖" when agentName context is null', () => {
    const ctx = ctxWithAgentName(null);
    const line1 = stripAnsi(render(ctx).split('\n')[0]);
    assert.ok(!line1.includes('🤖'), `expected no "🤖" in Line 1 when agentName is null, got: ${JSON.stringify(line1)}`);
  });

  it('Line 1 does not contain "🤖" when testCtx has no agentName field', () => {
    const line1 = stripAnsi(render(testCtx).split('\n')[0]);
    assert.ok(!line1.includes('🤖'), `expected no "🤖" in baseline Line 1, got: ${JSON.stringify(line1)}`);
  });
});

describe('feature: agentName — empty string treated as null', () => {
  it('Line 1 does not contain "🤖" when agentName is empty string', () => {
    const ctx = ctxWithAgentName('');
    const line1 = stripAnsi(render(ctx).split('\n')[0]);
    assert.ok(!line1.includes('🤖'), `expected no "🤖" in Line 1 when agentName is empty string, got: ${JSON.stringify(line1)}`);
  });
});

describe('feature toggle: agentName: false — toggle disabled', () => {
  it('Line 1 does not contain "🤖" when agentName toggle is false even if context has value', () => {
    const ctx = ctxWithAgentName('Explore');
    const config = configWithAgentName(false);
    const line1 = stripAnsi(render(ctx, config).split('\n')[0]);
    assert.ok(!line1.includes('🤖'), `expected no "🤖" when agentName=false, got: ${JSON.stringify(line1)}`);
  });

  it('other Line 1 segments still present when agentName=false', () => {
    const ctx = ctxWithAgentName('Explore');
    const config = configWithAgentName(false);
    const line1 = stripAnsi(render(ctx, config).split('\n')[0]);
    assert.ok(line1.includes('📁'), `expected 📁 still present when agentName=false`);
    assert.ok(line1.includes('opus-4-6'), `expected model name still present when agentName=false`);
  });
});

type StatuslineConfigWithSmartHide = Omit<StatuslineConfig, 'features'> & {
  features: StatuslineFeatures & { smartHide?: boolean };
};

function makeSmartHideConfig(smartHide: boolean, overrides: Partial<StatuslineFeatures> = {}): StatuslineConfigWithSmartHide {
  return {
    features: { ...allEnabled.features, ...overrides, smartHide },
    display: allEnabled.display,
  };
}

describe('smartHide — Line 1: uncommittedCount=0, committedCount=5, smartHide=true', () => {
  const ctx: RenderContext = {
    ...testCtx,
    git: { branchLabel: '🌱 feature/test', uncommittedCount: 0, committedCount: 5 },
  };

  it('Line 1 does not contain "UnCommit: 0" when uncommittedCount=0 and smartHide=true', () => {
    const config = makeSmartHideConfig(true) as unknown as StatuslineConfig;
    const line1 = stripAnsi(render(ctx, config).split('\n')[0]);
    assert.ok(!line1.includes('UnCommit: 0'), `expected no "UnCommit: 0" when uncommittedCount=0 and smartHide=true, got: ${JSON.stringify(line1)}`);
  });

  it('Line 1 contains "Commited: 5" when committedCount=5 and smartHide=true', () => {
    const config = makeSmartHideConfig(true) as unknown as StatuslineConfig;
    const line1 = stripAnsi(render(ctx, config).split('\n')[0]);
    assert.ok(line1.includes('Commited: 5'), `expected "Commited: 5" in Line 1 when committedCount=5 and smartHide=true, got: ${JSON.stringify(line1)}`);
  });
});

describe('smartHide — Line 1: uncommittedCount=3, committedCount=0, smartHide=true', () => {
  const ctx: RenderContext = {
    ...testCtx,
    git: { branchLabel: '🌱 feature/test', uncommittedCount: 3, committedCount: 0 },
  };

  it('Line 1 contains "UnCommit: 3" when uncommittedCount=3 and smartHide=true', () => {
    const config = makeSmartHideConfig(true) as unknown as StatuslineConfig;
    const line1 = stripAnsi(render(ctx, config).split('\n')[0]);
    assert.ok(line1.includes('UnCommit: 3'), `expected "UnCommit: 3" in Line 1 when uncommittedCount=3 and smartHide=true, got: ${JSON.stringify(line1)}`);
  });

  it('Line 1 does not contain "Commited: 0" when committedCount=0 and smartHide=true', () => {
    const config = makeSmartHideConfig(true) as unknown as StatuslineConfig;
    const line1 = stripAnsi(render(ctx, config).split('\n')[0]);
    assert.ok(!line1.includes('Commited: 0'), `expected no "Commited: 0" when committedCount=0 and smartHide=true, got: ${JSON.stringify(line1)}`);
  });
});

describe('smartHide — Line 2: added=0, removed=0, smartHide=true', () => {
  const ctx: RenderContext = { ...testCtx, added: 0, removed: 0 };

  it('Line 2 does not contain "+0 -0" when added=0 removed=0 and smartHide=true', () => {
    const config = makeSmartHideConfig(true) as unknown as StatuslineConfig;
    const line2 = stripAnsi(render(ctx, config).split('\n')[1]);
    assert.ok(!line2.includes('+0 -0'), `expected no "+0 -0" when added=0 removed=0 and smartHide=true, got: ${JSON.stringify(line2)}`);
  });
});

describe('smartHide — Line 2: added=1, removed=0, smartHide=true', () => {
  const ctx: RenderContext = { ...testCtx, added: 1, removed: 0 };

  it('Line 2 contains "+1 -0" when added=1 removed=0 and smartHide=true (non-zero not hidden)', () => {
    const config = makeSmartHideConfig(true) as unknown as StatuslineConfig;
    const line2 = stripAnsi(render(ctx, config).split('\n')[1]);
    assert.ok(line2.includes('+1 -0'), `expected "+1 -0" in Line 2 when added=1 removed=0 and smartHide=true, got: ${JSON.stringify(line2)}`);
  });
});

describe('smartHide — Line 3: cacheHitPct=null, smartHide=true', () => {
  const ctx: RenderContext = { ...testCtx, cacheHitPct: null };

  it('Line 3 does not contain "Cache" when cacheHitPct=null and smartHide=true', () => {
    const config = makeSmartHideConfig(true) as unknown as StatuslineConfig;
    const line3 = stripAnsi(render(ctx, config).split('\n')[2]);
    assert.ok(!line3.includes('Cache'), `expected no "Cache" in Line 3 when cacheHitPct=null and smartHide=true, got: ${JSON.stringify(line3)}`);
  });
});

describe('smartHide — Line 3: cacheHitPct=75, smartHide=true', () => {
  const ctx: RenderContext = { ...testCtx, cacheHitPct: 75 };

  it('Line 3 contains "Cache 75%" when cacheHitPct=75 and smartHide=true', () => {
    const config = makeSmartHideConfig(true) as unknown as StatuslineConfig;
    const line3 = stripAnsi(render(ctx, config).split('\n')[2]);
    assert.ok(line3.includes('Cache 75%'), `expected "Cache 75%" in Line 3 when cacheHitPct=75 and smartHide=true, got: ${JSON.stringify(line3)}`);
  });
});

describe('smartHide — cacheHit: false takes priority over smartHide: true', () => {
  const ctx: RenderContext = { ...testCtx, cacheHitPct: null };

  it('Line 3 does not contain "Cache" when cacheHit=false regardless of smartHide', () => {
    const config = makeSmartHideConfig(true, { cacheHit: false }) as unknown as StatuslineConfig;
    const line3 = stripAnsi(render(ctx, config).split('\n')[2]);
    assert.ok(!line3.includes('Cache'), `expected no "Cache" when cacheHit=false, got: ${JSON.stringify(line3)}`);
  });
});

describe('smartHide=false — backward compat: all zero/null values still rendered', () => {
  const ctxAllZero: RenderContext = {
    ...testCtx,
    git: { branchLabel: '🌱 feature/test', uncommittedCount: 0, committedCount: 0 },
    added: 0,
    removed: 0,
    cacheHitPct: null,
  };

  it('Line 1 contains "UnCommit: 0" when uncommittedCount=0 and smartHide=false', () => {
    const config = makeSmartHideConfig(false) as unknown as StatuslineConfig;
    const line1 = stripAnsi(render(ctxAllZero, config).split('\n')[0]);
    assert.ok(line1.includes('UnCommit: 0'), `expected "UnCommit: 0" when smartHide=false, got: ${JSON.stringify(line1)}`);
  });

  it('Line 1 contains "Commited: 0" when committedCount=0 and smartHide=false', () => {
    const config = makeSmartHideConfig(false) as unknown as StatuslineConfig;
    const line1 = stripAnsi(render(ctxAllZero, config).split('\n')[0]);
    assert.ok(line1.includes('Commited: 0'), `expected "Commited: 0" when smartHide=false, got: ${JSON.stringify(line1)}`);
  });

  it('Line 2 contains "+0 -0" when added=0 removed=0 and smartHide=false', () => {
    const config = makeSmartHideConfig(false) as unknown as StatuslineConfig;
    const line2 = stripAnsi(render(ctxAllZero, config).split('\n')[1]);
    assert.ok(line2.includes('+0 -0'), `expected "+0 -0" when smartHide=false, got: ${JSON.stringify(line2)}`);
  });

  it('Line 3 contains "Cache N/A" when cacheHitPct=null and smartHide=false', () => {
    const config = makeSmartHideConfig(false) as unknown as StatuslineConfig;
    const line3 = stripAnsi(render(ctxAllZero, config).split('\n')[2]);
    assert.ok(line3.includes('Cache N/A'), `expected "Cache N/A" when smartHide=false, got: ${JSON.stringify(line3)}`);
  });
});
