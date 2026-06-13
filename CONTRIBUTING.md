# Contributing to websearch-deepseek

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Install dependencies**: `npm install`
4. **Set API key**: `export DEEPSEEK_API_KEY=sk-...`

## Project Structure

```
src/
├── types.ts       # Shared types + SearchError
├── auth.ts        # API key resolution
├── core.ts        # searchWeb() + formatResults() — framework-agnostic
├── mcp.ts         # MCP server (JSON-RPC over stdio)
└── cli.ts         # CLI interface

index.ts           # Pi agent extension (thin adapter)
```

## Development Commands

```bash
npm run check        # TypeScript type check
npm run format       # Format with Prettier
npm run format:check # Check formatting

# Test MCP server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx tsx src/mcp.ts

# Test CLI
npm run search "test query"

# Test pi extension
pi -e ./index.ts
```

## Adding New Interfaces

The core logic in `src/core.ts` is framework-agnostic. To add support for a new agent framework:

1. Create a new adapter file (e.g., `src/openai.ts`)
2. Import `searchWeb` and `formatResults` from `./core`
3. Wrap them in the target framework's tool API
4. Add entry to `package.json` exports if needed

## Pull Request Checklist

- [ ] `npm run check` passes (TypeScript)
- [ ] `npm run format:check` passes (Prettier)
- [ ] New interfaces work end-to-end (test with real API key)
- [ ] Documentation updated in README.md
