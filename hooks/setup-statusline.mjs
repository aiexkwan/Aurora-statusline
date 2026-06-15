import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

try {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || process.cwd();
  const statusLineCommand = `node "${pluginRoot}/dist/index.js"`;

  const claudeDir = join(homedir(), '.claude');
  const settingsPath = join(claudeDir, 'settings.json');

  let settings = {};
  if (existsSync(settingsPath)) {
    const raw = readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(raw);
  }

  if (settings.statusLine) {
    process.exit(0);
  }

  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  settings.statusLine = { command: statusLineCommand };
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
} catch {
  process.exit(0);
}
