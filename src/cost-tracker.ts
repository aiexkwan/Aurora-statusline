import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { MonthlyCostCache } from './types.js';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function loadMonthlyCostCache(currentMonth: string, cachePath: string): MonthlyCostCache {
  const empty: MonthlyCostCache = { month: currentMonth, sessions: {} };
  try {
    if (existsSync(cachePath)) {
      const raw = readFileSync(cachePath, 'utf-8');
      const stored = JSON.parse(raw) as MonthlyCostCache;
      if (stored.month === currentMonth) return stored;
    }
  } catch {
    /* silent-ok: cache read failure → start fresh */
  }
  return empty;
}

export async function trackSessionCost(sessionId: string, cost: number, cachePath: string): Promise<number> {
  const currentMonth = getCurrentMonth();
  const cache = loadMonthlyCostCache(currentMonth, cachePath);
  cache.sessions[sessionId] = cost;
  try {
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, JSON.stringify(cache));
  } catch {
    /* silent-ok: cache write failure → continue without persisting */
  }
  return Object.values(cache.sessions).reduce((sum, sessionCost) => sum + sessionCost, 0);
}
