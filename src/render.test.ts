import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render, resolveModel } from './render';
import type { RenderContext } from './types';

import { calcCacheHitPct } from './context';

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
    // line 2: session bar with actual percentage
    assert.ok(lines[1].includes('💬 Session ['));
    assert.ok(lines[1].includes('] 40%'));
    assert.ok(lines[1].includes('🗯 Cxt [███░░░░░░░] 30%'));
    assert.ok(lines[1].includes('+12 -3'));
    // line 3: weekly bar with actual percentage
    assert.ok(lines[2].includes('📅 Weekly ['));
    assert.ok(lines[2].includes('] 70%'));
    assert.ok(lines[2].includes('API Est: $4.56/mth'));
  });

  it('renders N/A placeholders when rateLimits is absent (without branchLabel)', () => {
    const output = render(baseCtx);
    const lines = output.split('\n');
    // line 2: session bar shows N/A
    assert.ok(lines[1].includes('💬 Session [░░░░░░░░░░] N/A'));
    assert.ok(lines[1].includes('🗯 Cxt [███░░░░░░░] 30%'));
    assert.ok(lines[1].includes('+12 -3'));
    // line 3: weekly bar shows N/A
    assert.ok(lines[2].includes('📅 Weekly [░░░░░░░░░░] N/A'));
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
