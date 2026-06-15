export interface InputJSON {
  model?: { id?: string; display_name?: string };
  workspace?: { current_dir?: string };
  cwd?: string;
  session_id?: string;
  context_window?: {
    total_input_tokens?: number;
    context_window_size?: number;
    current_usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    } | null;
  };
  rate_limits?: {
    five_hour?: { used_percentage?: number; resets_at?: string };
    seven_day?: { used_percentage?: number; resets_at?: string };
  };
  cost?: {
    total_cost_usd?: number;
    total_lines_added?: number;
    total_lines_removed?: number;
  };
}

export interface MonthlyCostCache {
  month: string;
  sessions: Record<string, number>;
}

export interface GitInfo {
  branchLabel: string;
  uncommittedCount: number;
  committedCount: number;
}

export interface RenderContext {
  projectName: string;
  model: string;
  git: GitInfo;
  ctxBar: string;
  ctxPct: number;
  added: number;
  removed: number;
  monthlyCost: number;
  sessionCost: number;
  rateLimits: InputJSON['rate_limits'];
  cacheHitPct: number | null;
}

export interface StatuslineFeatures {
  git: boolean;
  contextWindow: boolean;
  rateLimits: boolean;
  cacheHit: boolean;
  sessionCost: boolean;
  monthlyCost: boolean;
  linesChanged: boolean;
}

export interface StatuslineDisplay {
  colorMode: 'ansi' | 'plain';
  barWidth: number;
}

export interface StatuslineConfig {
  features: StatuslineFeatures;
  display: StatuslineDisplay;
}
