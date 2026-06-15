import type { MonthlyCostCache } from './types';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function loadMonthlyCostCache(currentMonth: string, cachePath: string): Promise<MonthlyCostCache> {
  const empty: MonthlyCostCache = { month: currentMonth, sessions: {} };
  try {
    const file = Bun.file(cachePath);
    if (await file.exists()) {
      const stored = (await file.json()) as MonthlyCostCache;
      if (stored.month === currentMonth) return stored;
    }
  } catch {
    /* silent-ok: cache read failure → start fresh */
  }
  return empty;
}

export async function trackSessionCost(sessionId: string, cost: number, cachePath: string): Promise<number> {
  const currentMonth = getCurrentMonth();
  const cache = await loadMonthlyCostCache(currentMonth, cachePath);
  cache.sessions[sessionId] = cost;
  try {
    await Bun.write(cachePath, JSON.stringify(cache));
  } catch {
    /* silent-ok: cache write failure → continue without persisting */
  }
  return Object.values(cache.sessions).reduce((sum, v) => sum + v, 0);
}
