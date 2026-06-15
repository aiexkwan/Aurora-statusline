import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, saveConfig, resetConfig, DEFAULT_CONFIG } from './config.js';

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'statusline-config-test-'));
}

// ── loadConfig() ─────────────────────────────────────────────────────────────

describe('loadConfig() — no config file', () => {
  let tmpDir: string;
  let configPath: string;

  before(() => {
    tmpDir = makeTmpDir();
    configPath = join(tmpDir, 'statusline-config.json');
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns DEFAULT_CONFIG when no config file exists', () => {
    const result = loadConfig(configPath);
    assert.deepStrictEqual(result, DEFAULT_CONFIG);
  });

  it('returned config has all 7 feature flags set to true', () => {
    const result = loadConfig(configPath);
    assert.strictEqual(result.features.git, true);
    assert.strictEqual(result.features.contextWindow, true);
    assert.strictEqual(result.features.rateLimits, true);
    assert.strictEqual(result.features.cacheHit, true);
    assert.strictEqual(result.features.sessionCost, true);
    assert.strictEqual(result.features.monthlyCost, true);
    assert.strictEqual(result.features.linesChanged, true);
  });

  it('returned config has colorMode ansi and barWidth 10', () => {
    const result = loadConfig(configPath);
    assert.strictEqual(result.display.colorMode, 'ansi');
    assert.strictEqual(result.display.barWidth, 10);
  });
});

describe('loadConfig() — partial config merge', () => {
  let tmpDir: string;
  let configPath: string;

  before(() => {
    tmpDir = makeTmpDir();
    configPath = join(tmpDir, 'statusline-config.json');
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('merges partial features — git=false, others default to true', () => {
    writeFileSync(configPath, JSON.stringify({ features: { git: false } }), 'utf-8');
    const result = loadConfig(configPath);
    assert.strictEqual(result.features.git, false, 'git should be false from config');
    assert.strictEqual(result.features.contextWindow, true, 'contextWindow should default to true');
    assert.strictEqual(result.features.rateLimits, true, 'rateLimits should default to true');
    assert.strictEqual(result.features.cacheHit, true, 'cacheHit should default to true');
    assert.strictEqual(result.features.sessionCost, true, 'sessionCost should default to true');
    assert.strictEqual(result.features.monthlyCost, true, 'monthlyCost should default to true');
    assert.strictEqual(result.features.linesChanged, true, 'linesChanged should default to true');
  });

  it('merges partial display — barWidth=15 overrides default 10', () => {
    writeFileSync(configPath, JSON.stringify({ display: { barWidth: 15 } }), 'utf-8');
    const result = loadConfig(configPath);
    assert.strictEqual(result.display.barWidth, 15, 'barWidth should be 15 from config');
    assert.strictEqual(result.display.colorMode, 'ansi', 'colorMode should default to ansi');
  });
});

describe('loadConfig() — corrupt JSON throws', () => {
  let tmpDir: string;
  let configPath: string;

  before(() => {
    tmpDir = makeTmpDir();
    configPath = join(tmpDir, 'statusline-config.json');
    writeFileSync(configPath, '{ invalid json !!!', 'utf-8');
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws when config file contains invalid JSON', () => {
    assert.throws(
      () => loadConfig(configPath),
      (err: unknown) => {
        assert.ok(err instanceof Error, 'expected Error instance');
        assert.ok(err.message.length > 0, 'expected non-empty error message');
        return true;
      },
    );
  });
});

// ── saveConfig() ─────────────────────────────────────────────────────────────

describe('saveConfig() — writes valid JSON', () => {
  let tmpDir: string;
  let configPath: string;

  before(() => {
    tmpDir = makeTmpDir();
    configPath = join(tmpDir, 'statusline-config.json');
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes config as valid JSON at specified path', () => {
    const cfg = { ...DEFAULT_CONFIG, display: { colorMode: 'plain' as const, barWidth: 8 } };
    saveConfig(cfg, configPath);
    assert.ok(existsSync(configPath), 'config file should exist after saveConfig()');
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    assert.strictEqual(parsed.display.colorMode, 'plain');
    assert.strictEqual(parsed.display.barWidth, 8);
  });
});

describe('saveConfig() — auto-creates directory', () => {
  let tmpDir: string;
  let nestedDir: string;
  let configPath: string;

  before(() => {
    tmpDir = makeTmpDir();
    nestedDir = join(tmpDir, 'deep', 'nested', 'dir');
    configPath = join(nestedDir, 'statusline-config.json');
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates missing directories before writing config file', () => {
    assert.ok(!existsSync(nestedDir), 'directory should NOT exist before saveConfig()');
    saveConfig(DEFAULT_CONFIG, configPath);
    assert.ok(existsSync(configPath), 'config file should exist after auto-created dir');
  });
});

// ── resetConfig() ────────────────────────────────────────────────────────────

describe('resetConfig() — deletes config file', () => {
  let tmpDir: string;
  let configPath: string;

  before(() => {
    tmpDir = makeTmpDir();
    configPath = join(tmpDir, 'statusline-config.json');
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('removes config file after resetConfig()', () => {
    writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG), 'utf-8');
    assert.ok(existsSync(configPath), 'config file should exist before resetConfig()');
    resetConfig(configPath);
    assert.ok(!existsSync(configPath), 'config file should NOT exist after resetConfig()');
  });

  it('does not throw when no config file exists', () => {
    assert.doesNotThrow(() => resetConfig(configPath));
  });
});

// ── CONFIG_PATH uses project directory ────────────────────────────────────────

describe('CONFIG_PATH points to project-local config/', () => {
  it('CONFIG_PATH ends with config/statusline.json', () => {
    const { CONFIG_PATH } = require('./config.js');
    assert.ok(CONFIG_PATH.endsWith('config/statusline.json'), `CONFIG_PATH should end with config/statusline.json, got: "${CONFIG_PATH}"`);
  });

  it('CONFIG_PATH does not include .claude', () => {
    const { CONFIG_PATH } = require('./config.js');
    assert.ok(!CONFIG_PATH.includes('.claude'), `CONFIG_PATH should not contain .claude, got: "${CONFIG_PATH}"`);
  });
});
