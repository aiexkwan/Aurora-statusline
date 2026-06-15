import { describe, it, expect } from 'bun:test';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { trackSessionCost } from './cost-tracker';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function makeTempCachePath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cost-tracker-test-'));
  return join(dir, 'monthly-cost.json');
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function lastMonth(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('trackSessionCost', () => {
  it('accumulates costs across multiple sessions in the same month', async () => {
    // Arrange
    const cachePath = await makeTempCachePath();

    // Act — first session writes $0.10
    await trackSessionCost('session-A', 0.1, cachePath);
    // Act — second session writes $0.05; monthly total should be 0.10 + 0.05
    const result = await trackSessionCost('session-B', 0.05, cachePath);

    // Assert
    expect(result).toBeCloseTo(0.15, 5);
  });

  it('resets sessions when the cache belongs to a previous month', async () => {
    // Arrange — write a stale cache file from last month with existing sessions
    const cachePath = await makeTempCachePath();
    const staleCache = {
      month: lastMonth(),
      sessions: { 'old-session-1': 5.0, 'old-session-2': 3.0 },
    };
    await Bun.write(cachePath, JSON.stringify(staleCache));

    // Act — call with current month; old sessions must be discarded
    const result = await trackSessionCost('new-session', 0.2, cachePath);

    // Assert — only the new session's cost, not the stale total (8.20)
    expect(result).toBeCloseTo(0.2, 5);
  });

  it('falls back gracefully when the cache file does not exist', async () => {
    // Arrange — point to a path that will never be created beforehand
    const dir = await mkdtemp(join(tmpdir(), 'cost-tracker-missing-'));
    const nonExistentCachePath = join(dir, 'does-not-exist', 'monthly-cost.json');

    // Act & Assert — must not throw; returns the current session cost
    let result: number | undefined;
    expect(async () => {
      result = await trackSessionCost('session-X', 0.3, nonExistentCachePath);
    }).not.toThrow();

    // Give the async call a chance to complete even though the assertion above
    // runs synchronously against the async function reference.
    result = await trackSessionCost('session-X', 0.3, nonExistentCachePath);
    expect(result).toBeCloseTo(0.3, 5);
  });
});
