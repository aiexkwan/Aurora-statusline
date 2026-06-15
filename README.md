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

## Requirements

- **Node.js 18+** (ships with Claude Code)
- **git** (for branch info)

## Configuration

Aurora reads these environment variables:

| Variable | Default | Meaning |
|---|---|---|
| `STATUSLINE_CACHE_DIR` | `~/.claude` | directory for monthly cost cache file |

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
│   ├── render.ts             # pure function — formats 3-line output
│   ├── context.ts            # context window calculations, cache hit ratio
│   ├── cost-tracker.ts       # monthly cost accumulation across sessions
│   ├── git.ts                # git branch and status extraction
│   └── types.ts              # TypeScript interfaces
├── dist/                     # compiled output (npm run build)
├── package.json
└── tsconfig.json
```

## License

[MIT](./LICENSE)
