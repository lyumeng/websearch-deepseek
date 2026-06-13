# Changelog

## [0.2.0] - 2025-06-13

### Added

- **MCP server** (`src/mcp.ts`) — exposes `web_search` tool via JSON-RPC over stdio
- **CLI interface** (`src/cli.ts`) — `npx websearch-deepseek search "query"`
- **Framework-agnostic core** (`src/core.ts`) — importable in any Node.js project
- Multi-agent compatibility: Claude Code, Cursor, Continue, OpenCode, OpenClaw, etc.

### Changed

- Extracted `searchWeb()` and `formatResults()` into `src/core.ts` (no framework deps)
- Pi extension (`index.ts`) is now a thin wrapper around `src/core.ts`
- `package.json`: added `bin`, `exports` maps, MCP keywords

## [0.1.0] - 2025-06-13

### Added

- Initial release: pi agent extension with `web_search` tool
- DeepSeek native web search via Anthropic-compatible API
- API key resolution from pi auth store + environment variables
