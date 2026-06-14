# websearch-deepseek

> [中文版](./README.zh-CN.md)

A universal **MCP Server** that provides a web search tool powered by DeepSeek's native web search API — no third-party search API required.

Works with **Claude Code**, **Cursor**, **Continue**, **OpenCode**, **pi**, and any tool that supports the MCP protocol.

## Features

- 🔍 **DeepSeek Native Search** — Uses the server-side `web_search_20250305` tool, no third-party search API needed
- 📝 **AI-Generated Answers** — Returns detailed answers synthesized from full page content, not just a list of URLs
- 🔗 **Source URLs Included** — Every answer comes with original source links for verification
- ⚙️ **Flexible Configuration** — Choose model, toggle thinking mode, adjust token limits
- 🌐 **MCP Protocol** — Standard JSON-RPC over stdio, compatible with all MCP clients

## How It Works

```
User Query → DeepSeek Model
                  ↓
        Server executes web_search (fetches pages)
                  ↓
        Encrypted page content → Server decrypts → Feeds to model
                  ↓
        Model generates detailed answer based on full content
                  ↓
Returns: AI-generated answer + source URL list
```

**One MCP tool call = One DeepSeek API request** — search, decryption, and answer generation all happen server-side.

## Quick Start

### 1. Get a DeepSeek API Key

Visit [DeepSeek Platform](https://platform.deepseek.com/) to sign up and get your API Key.

### 2. Install

```bash
npm install -g websearch-deepseek
```

### 3. Configure Your AI Coding Assistant

Add the following to your MCP configuration file:

#### Claude Code

Edit `~/.claude/claude_desktop_config.json` or `.mcp.json` in your project:

```json
{
  "mcpServers": {
    "websearch-deepseek": {
      "command": "npx",
      "args": ["websearch-deepseek"],
      "env": {
        "DEEPSEEK_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "WEBSEARCH_MODEL": "deepseek-v4-flash",
        "WEBSEARCH_THINKING": "enabled"
      }
    }
  }
}
```

#### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "websearch-deepseek": {
      "command": "npx",
      "args": ["websearch-deepseek"],
      "env": {
        "DEEPSEEK_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

#### Continue (VS Code)

Edit `~/.continue/config.json`, add to `mcpServers`:

```json
{
  "mcpServers": [
    {
      "name": "websearch-deepseek",
      "command": "npx",
      "args": ["websearch-deepseek"],
      "env": {
        "DEEPSEEK_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  ]
}
```

#### pi

Edit `~/.pi/agent/settings.json`, add to `mcp`:

```json
{
  "mcp": {
    "websearch-deepseek": {
      "command": "npx",
      "args": ["websearch-deepseek"],
      "env": {
        "DEEPSEEK_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### 4. Start Using It

Restart your AI coding assistant and ask a question that needs real-time information. The assistant will automatically call the `web_search` tool when needed.

Examples:
- "What's new in React 19?"
- "Search for Python 3.13 release date and major updates"
- "What are the latest AI industry news?"

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEEPSEEK_API_KEY` | ✅ Yes | — | DeepSeek API Key |
| `WEBSEARCH_API_KEY` | ❌ No | — | Alternative API Key variable name |
| `WEBSEARCH_MODEL` | ❌ No | `deepseek-v4-flash` | Model: `deepseek-v4-flash` (fast) or `deepseek-v4-pro` (powerful) |
| `WEBSEARCH_THINKING` | ❌ No | `enabled` | Thinking mode: `enabled` / `disabled` |
| `WEBSEARCH_MAX_TOKENS` | ❌ No | `8192` | Max tokens for response |

### Model Selection Guide

| Scenario | Recommended Model | Notes |
|----------|-------------------|-------|
| Daily search (default) | `deepseek-v4-flash` | Fast, low cost, good quality |
| Deep research | `deepseek-v4-pro` | More detailed and accurate, slightly slower |

### Thinking Mode

- **enabled** (default): The model thinks before answering, producing higher quality results but consuming more tokens
- **disabled**: Skips the thinking step for faster responses, suitable for simple queries

## CLI Usage

You can also use it directly from the terminal:

```bash
# Set API Key
export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx

# Search
npx websearch-deepseek search "Node.js LTS versions"

# JSON output
npx websearch-deepseek search --json "TypeScript 5.8"

# Specify model and disable thinking
npx websearch-deepseek search --model deepseek-v4-pro --no-thinking "Rust latest version"
```

## Output Example

```
## Node.js Latest LTS Versions

As of July 2025, the latest Active LTS version of Node.js is Node.js 24.x...

| Version | Status | Initial Release | Support Until |
|---------|--------|-----------------|---------------|
| 24.x    | Active LTS | 2025-05-06 | 2028-04 |
| 22.x    | Maintenance | 2024-10   | 2027-04 |

### Recommendations
- New projects: Use Node.js 24 LTS
- Existing projects: Node.js 22 continues to receive security updates

---

### Sources (10):
1. [Node.js 24.0 is available...](https://...)
2. [Node.js — Node.js Releases](https://...)
...
```

## Pricing

This tool uses the DeepSeek API, which charges per token. A single search typically consumes:

| Component | Estimated Tokens |
|-----------|-----------------|
| Search + thinking | ~5,000–8,000 |
| Generate answer | ~1,000–3,000 |
| **Total per search** | **~8,000–15,000 tokens** |

Check [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing) for current rates.

## License

MIT

---

<p align="center">
  <a href="./README.zh-CN.md">中文版</a>
</p>
