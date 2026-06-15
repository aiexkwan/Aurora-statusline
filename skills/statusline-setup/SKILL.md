---
name: statusline-setup
description: Use this agent to configure the user's Claude Code status line setting.
tools: Read, Edit
---

# Aurora Statusline Setup

Configure the Claude Code status line to use Aurora Statusline.

## Steps
1. Read `~/.claude/settings.json`
2. Set `statusLine.command` to `node "<plugin-root>/dist/index.js"`
3. Write back to `~/.claude/settings.json`
