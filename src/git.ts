import { join } from 'path';
import { existsSync } from 'fs';
import type { GitInfo } from './types';

const decoder = new TextDecoder();

const DEFAULT_BRANCHES = new Set(['main', 'master']);

function gitRun(args: string[], cwd: string): string {
  const result = Bun.spawnSync(['git', '-c', 'core.fileMode=false', '-c', 'advice.detachedHead=false', ...args], { cwd, stderr: 'pipe' });
  if (result.exitCode !== 0) return '';
  return decoder.decode(result.stdout).trim();
}

function getCommittedCount(cwd: string): number {
  const upstream = gitRun(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], cwd);
  if (!upstream) return 0;
  const countStr = gitRun(['rev-list', '--count', `${upstream}..HEAD`], cwd);
  return parseInt(countStr, 10) || 0;
}

export function getGitInfo(cwd: string): GitInfo {
  const empty: GitInfo = { branchLabel: '', uncommittedCount: 0, committedCount: 0 };
  if (!cwd) return empty;

  const gitDir = join(cwd, '.git');
  if (!existsSync(gitDir)) return empty;

  const branch = gitRun(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  if (!branch) return empty;

  const statusOutput = gitRun(['status', '--porcelain'], cwd);
  const uncommittedCount = statusOutput.split('\n').filter(Boolean).length;
  const branchLabel = DEFAULT_BRANCHES.has(branch) ? `🌿 ${branch}` : `🌱 ${branch}`;
  return { branchLabel, uncommittedCount, committedCount: getCommittedCount(cwd) };
}
