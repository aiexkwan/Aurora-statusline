import * as readline from 'readline';
import { loadConfig, saveConfig, CONFIG_PATH } from './config.js';
import type { StatuslineConfig } from './types.js';

const FEATURE_KEYS: (keyof StatuslineConfig['features'])[] = ['git', 'contextWindow', 'rateLimits', 'cacheHit', 'sessionCost', 'monthlyCost', 'linesChanged'];

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

async function askFeatures(rl: readline.Interface, current: StatuslineConfig['features']): Promise<StatuslineConfig['features']> {
  const features = { ...current };
  for (const key of FEATURE_KEYS) {
    const ans = await ask(rl, `Enable ${key}? [Y/n]: `);
    features[key] = ans.trim().toLowerCase() !== 'n';
  }
  return features;
}

async function askDisplay(rl: readline.Interface): Promise<StatuslineConfig['display']> {
  const colorAns = await ask(rl, 'Color mode (ansi/plain) [ansi]: ');
  const colorMode: 'ansi' | 'plain' = colorAns.trim().toLowerCase() === 'plain' ? 'plain' : 'ansi';

  const barAns = await ask(rl, 'Bar width (5-20) [10]: ');
  const barRaw = parseInt(barAns.trim(), 10);
  const valid = Number.isInteger(barRaw) && barRaw >= 5 && barRaw <= 20;
  if (!valid) console.error(`Invalid barWidth "${barAns.trim()}", using default 10.`);
  return { colorMode, barWidth: valid ? barRaw : 10 };
}

function printSummary(features: StatuslineConfig['features']): void {
  console.log('\nSummary:');
  for (const key of FEATURE_KEYS) {
    console.log(`  ${features[key] ? '✅' : '❌'} ${key}`);
  }
}

export async function runWizard(): Promise<void> {
  if (!process.stdin.isTTY) {
    console.error('Error: runWizard() requires an interactive TTY (stdin is not a TTY).');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const current = loadConfig();

  const features = await askFeatures(rl, current.features);
  const display = await askDisplay(rl);
  rl.close();

  const config: StatuslineConfig = { features, display };
  printSummary(features);
  saveConfig(config);
  console.log(`\nConfig saved to ${CONFIG_PATH}`);
}
