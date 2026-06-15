import type { StatuslineConfig } from './types.js';
import { join, isAbsolute, dirname } from 'path';
import { homedir } from 'os';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';

export const DEFAULT_CONFIG: StatuslineConfig = {
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

function getConfigPath(): string {
  const envDir = process.env.STATUSLINE_CACHE_DIR;
  if (envDir !== undefined) {
    if (!isAbsolute(envDir)) {
      throw new Error(`STATUSLINE_CACHE_DIR must be an absolute path, got: "${envDir}"`);
    }
    return join(envDir, 'statusline-config.json');
  }
  return join(homedir(), '.claude', 'statusline-config.json');
}

export const CACHE_DIR = process.env.STATUSLINE_CACHE_DIR ?? join(homedir(), '.claude');
export const CONFIG_PATH = join(CACHE_DIR, 'statusline-config.json');

export function loadConfig(configPath?: string): StatuslineConfig {
  const path = configPath ?? getConfigPath();

  if (!existsSync(path)) {
    return structuredClone(DEFAULT_CONFIG);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf-8'));
  } catch (e) {
    throw new Error(`Failed to parse config file at "${path}": ${(e as Error).message}`, { cause: e });
  }

  const r = raw as Partial<StatuslineConfig> & {
    features?: Partial<StatuslineConfig['features']>;
    display?: Partial<StatuslineConfig['display']>;
  };

  return {
    features: { ...DEFAULT_CONFIG.features, ...r.features },
    display: { ...DEFAULT_CONFIG.display, ...r.display },
  };
}

export function saveConfig(config: StatuslineConfig, configPath?: string): void {
  const path = configPath ?? getConfigPath();
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8');
}

export function resetConfig(configPath?: string): void {
  const path = configPath ?? getConfigPath();
  if (existsSync(path)) {
    unlinkSync(path);
  }
}
