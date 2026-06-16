# Aurora Statusline

> A rich, data-dense statusline for [Claude Code](https://claude.ai/code) — model badge,
> git info, context window, rate limits, cache hit ratio, and monthly cost at a glance.
> Installs as a **Claude Code plugin** with zero manual config.

```text
📁 my-project | opus-4-6 | 🌱 feat/new-module | UnCommit: 2 | Commited: 1
💬 Session [███░░░░░░░] 35% | 🗯 Cxt [█████░░░░░] 50% | +156 -23
📅 Weekly [██████░░░░] 62% | 🎯 Cache 75% | API Est: $3.42/mth
```

## Install

### As a Claude Code plugin (recommended)

Add this repository as a marketplace, then install:

```text
/plugin marketplace add github:aiexkwan/Aurora-statusline
/plugin install aurora-statusline
```

The statusline auto-configures on session start — no manual `settings.json` editing required.

### Manual

Clone and build:

```bash
git clone https://github.com/aiexkwan/Aurora-statusline.git
cd Aurora-statusline
npm install
npm run build
```

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/Aurora-statusline/dist/index.js"
  }
}
```

## What you get

| Segment | Shows |
|---|---|
| `project` | current working directory name |
| `model` | active Claude model ID (e.g. `opus-4-6`, `sonnet-4-6`) |
| `git` | branch name, uncommitted and committed-ahead counts |
| `session` | 5-hour rate limit gauge with percentage |
| `context` | context window usage bar and percentage |
| `lines` | lines added / removed this session |
| `weekly` | 7-day rate limit gauge with percentage |
| `cache` | prompt cache hit ratio |
| `cost` | estimated monthly API cost across all sessions |

## How it works

Claude Code pipes session JSON to the statusline command on stdin. Aurora parses it and
renders a compact 3-line display to stdout. The script runs locally with no network calls
and uses zero tokens.

### Data flow

```text
Claude Code ──stdin JSON──▶ Aurora Statusline ──stdout──▶ status bar
                                    │
                            ┌───────┼───────┐
                            │       │       │
                          model   git    cost cache
                          badge  status  tracker
```

## Configuration

Aurora stores its config at `config/statusline.json` within the project directory (project-local, not `~/.claude`).

### CLI flags

Run the statusline binary directly to manage your config:

| Flag | Action |
|---|---|
| `--setup` | Launch the interactive setup wizard to configure features and display options |
| `--config` | Print the current configuration as JSON |
| `--reset` | Delete the config file and restore all defaults |

Example:

```bash
node dist/index.js --setup
node dist/index.js --config
node dist/index.js --reset
```

### Feature Toggles

Each segment can be independently enabled or disabled via the setup wizard (`--setup`).

| Toggle key | What it controls |
|---|---|
| `git` | Branch name, uncommitted/committed counts |
| `contextWindow` | Context window usage bar and percentage |
| `rateLimits` | 5-hour session + 7-day weekly rate limit gauges |
| `cacheHit` | Prompt cache hit ratio |
| `sessionCost` | Current session API cost |
| `monthlyCost` | Monthly estimated API cost |
| `linesChanged` | Lines added/removed this session |

### Color Modes

| Option | Values | Description |
|---|---|---|
| `colorMode` | `ansi` / `plain` | `ansi` renders ANSI colored progress bars; `plain` outputs plain text |
| `barWidth` | `5` – `20` | Controls the width of all progress bars (default: `10`) |

### Environment Variables

| Variable | Default | Meaning |
|---|---|---|
| `STATUSLINE_CACHE_DIR` | `~/.claude` | Directory for monthly cost cache file |

## Requirements

- **Node.js 18+** (ships with Claude Code)
- **git** (for branch info)

## Project structure

```text
Aurora-statusline/
├── .claude-plugin/
│   ├── plugin.json           # plugin manifest
│   └── marketplace.json      # self-hosted marketplace config
├── hooks/
│   ├── hooks.json            # SessionStart hook definition
│   └── setup-statusline.mjs  # auto-configures statusline on install
├── skills/
│   └── statusline-setup/     # manual setup guidance
├── agents/
│   └── statusline-setup.md   # setup agent definition
├── src/
│   ├── index.ts              # entry — reads stdin, orchestrates modules
│   ├── types.ts              # TypeScript interfaces
│   ├── render.ts             # pure function — formats 3-line output with ANSI colors
│   ├── render.test.ts        # render tests (ANSI, colors, models, cache)
│   ├── render-config.test.ts # feature toggle tests
│   ├── context.ts            # context window calculations, cache hit ratio
│   ├── cost-tracker.ts       # monthly cost accumulation across sessions
│   ├── cost-tracker.test.ts  # monthly cost tests
│   ├── git.ts                # git branch and status extraction
│   ├── config.ts             # configuration loading/saving/reset
│   ├── config.test.ts        # config I/O tests
│   └── wizard.ts             # interactive setup wizard
├── config/
│   └── statusline.json       # project-local config (auto-created on first --setup)
├── dist/                     # compiled output (npm run build)
├── package.json
└── tsconfig.json
```

## License

[MIT](./LICENSE)
