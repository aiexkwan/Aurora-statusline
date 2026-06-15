# Changelog

## 3.0.0

### Added
- Setup wizard to customize which information shows on your status line — run `aurora-statusline --setup` to choose which features to display
- Each status line section can now be turned on or off independently: git info, context window, rate limits, cache hit ratio, session cost, monthly cost, and lines changed
- Plain color mode option for terminals that don't support colored output
- Adjustable progress bar width (5-20 characters) to fit different terminal sizes
- Quick commands to manage your preferences: `--config` to view current settings, `--reset` to restore defaults

### Changed
- Configuration is now stored in the plugin's own directory instead of the global settings folder

## 2.1.0

### Added
- Progress bars now change color based on usage level — green when low, yellow when moderate, red when high — so you can tell at a glance how close you are to limits
- Current session cost is now shown on the status line alongside the monthly estimate, making it easy to track spending per conversation

## 2.0.0

### Added
- Install as a Claude Code plugin — run `/plugin marketplace add` with this repo, then `/plugin install aurora-statusline` for automatic setup
- Status line auto-configures on session start after plugin installation, no manual settings editing needed

### Changed
- Now requires Node.js 18+ instead of Bun runtime
- Build step required: run `npm run build` to compile before first use

## 1.1.0

### Added
- Cache hit ratio display on the status line, showing how efficiently prompt caching is working during your session

### Changed
- Model name now shows the actual model identifier instead of emoji icons
