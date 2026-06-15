import { describe, it, expect } from 'bun:test';
import { render, resolveModel } from './render';
import type { RenderContext } from './types';

// Shared fixtures
const baseCtx: RenderContext = {
  projectName: 'my-project',
  model: 'claude-sonnet-4-6',
  git: { branchLabel: '', uncommittedCount: 0, committedCount: 0 },
  ctxBar: '███░░░░░░░',
  ctxPct: 30,
  added: 12,
  removed: 3,
  monthlyCost: 4.56,
  rateLimits: undefined,
};

const withBranch: RenderContext = {
  ...baseCtx,
  git: { branchLabel: '🌱 feat/new-module', uncommittedCount: 2, committedCount: 1 },
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
  it('returns modelId when provided, even if displayName would trigger legacy emoji mapping', () => {
    expect(resolveModel('claude-opus-4-6[1m]', 'Opus 4.6')).toBe('claude-opus-4-6[1m]');
  });

  it('falls back to displayName when modelId is undefined — Opus', () => {
    expect(resolveModel(undefined, 'Opus 4.6')).toBe('Opus 4.6');
  });

  it('falls back to displayName when modelId is undefined — Sonnet, not emoji', () => {
    expect(resolveModel(undefined, 'Sonnet 4.6')).toBe('Sonnet 4.6');
    expect(resolveModel(undefined, 'Sonnet 4.6')).not.toBe('🥈');
  });

  it('falls back to displayName when modelId is undefined — Haiku, not emoji', () => {
    expect(resolveModel(undefined, 'Haiku 4.5')).toBe('Haiku 4.5');
    expect(resolveModel(undefined, 'Haiku 4.5')).not.toBe('🥉');
  });

  it('returns raw modelId for haiku variant, not the legacy emoji', () => {
    expect(resolveModel('claude-haiku-4-5-20251001', 'Haiku 4.5')).toBe('claude-haiku-4-5-20251001');
  });

  it('does not return emoji for Sonnet displayName when modelId is provided', () => {
    const result = resolveModel('claude-sonnet-4-6', 'Sonnet 4.6');
    expect(result).toBe('claude-sonnet-4-6');
    expect(result).not.toBe('🥈');
  });
});

describe('render(ctx)', () => {
  it('renders line 1 with branchLabel when branchLabel is present', () => {
    const output = render(withBranchAndRateLimits);
    const line1 = output.split('\n')[0];
    expect(line1).toContain('📁 my-project');
    expect(line1).toContain('claude-sonnet-4-6');
    expect(line1).toContain('🌱 feat/new-module');
    expect(line1).toContain('UnCommit: 2');
    expect(line1).toContain('Commited: 1');
  });

  it('renders line 1 without branchLabel segment when branchLabel is empty', () => {
    const output = render(withRateLimits);
    const line1 = output.split('\n')[0];
    expect(line1).toContain('📁 my-project');
    expect(line1).toContain('claude-sonnet-4-6');
    expect(line1).not.toContain('🌱');
    expect(line1).not.toContain('🌿');
    expect(line1).toContain('UnCommit: 0');
    expect(line1).toContain('Commited: 0');
  });

  it('renders rate limit bars when rateLimits is present (with branchLabel)', () => {
    const output = render(withBranchAndRateLimits);
    const lines = output.split('\n');
    // line 2: session bar with actual percentage
    expect(lines[1]).toContain('💬 Session [');
    expect(lines[1]).toContain('] 40%');
    expect(lines[1]).toContain('🗯 Cxt [███░░░░░░░] 30%');
    expect(lines[1]).toContain('+12 -3');
    // line 3: weekly bar with actual percentage
    expect(lines[2]).toContain('📅 Weekly [');
    expect(lines[2]).toContain('] 70%');
    expect(lines[2]).toContain('API Est: $4.56/mth');
  });

  it('renders N/A placeholders when rateLimits is absent (without branchLabel)', () => {
    const output = render(baseCtx);
    const lines = output.split('\n');
    // line 2: session bar shows N/A
    expect(lines[1]).toContain('💬 Session [░░░░░░░░░░] N/A');
    expect(lines[1]).toContain('🗯 Cxt [███░░░░░░░] 30%');
    expect(lines[1]).toContain('+12 -3');
    // line 3: weekly bar shows N/A
    expect(lines[2]).toContain('📅 Weekly [░░░░░░░░░░] N/A');
    expect(lines[2]).toContain('API Est: $4.56/mth');
  });
});
