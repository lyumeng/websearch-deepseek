#!/usr/bin/env node
/**
 * websearch-deepseek — MCP Server
 *
 * 一个基于 DeepSeek 原生联网搜索 API 的 MCP 工具服务器。
 * 适用于 Claude Code、Cursor、Continue、OpenCode 等任何
 * 支持 MCP 协议的 AI 编程助手。
 *
 * ## 配置环境变量
 *
 * | 变量                    | 必填 | 默认值              | 说明                           |
 * |------------------------|------|---------------------|-------------------------------|
 * | DEEPSEEK_API_KEY       | 是   | -                   | DeepSeek API Key               |
 * | WEBSEARCH_MODEL        | 否   | deepseek-v4-flash   | 使用的模型                      |
 * | WEBSEARCH_THINKING     | 否   | enabled             | 思考模式: enabled / disabled    |
 * | WEBSEARCH_MAX_TOKENS   | 否   | 8192                | 回复最大 token 数               |
 *
 * ## 在 Claude Code / Cursor 等 Agent 中配置 MCP
 *
 * ```json
 * {
 *   "mcpServers": {
 *     "websearch-deepseek": {
 *       "command": "npx",
 *       "args": ["websearch-deepseek"],
 *       "env": {
 *         "DEEPSEEK_API_KEY": "sk-xxxxxxxxxxxxxxxx",
 *         "WEBSEARCH_MODEL": "deepseek-v4-flash",
 *         "WEBSEARCH_THINKING": "enabled"
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * @module
 */

import { searchWeb, formatResults } from "./core";

// ── Configuration (from environment variables) ─────────────────────────────

/** 从环境变量读取配置，带默认值 */
function getConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.WEBSEARCH_API_KEY || "",
    model: process.env.WEBSEARCH_MODEL || "deepseek-v4-flash",
    thinking: (process.env.WEBSEARCH_THINKING || "enabled") as
      | "enabled"
      | "disabled",
    maxTokens: parseInt(process.env.WEBSEARCH_MAX_TOKENS || "32768", 10),
  };
}

// ── MCP Tool definition ────────────────────────────────────────────────────

const TOOL_DEFINITION = {
  name: "web_search",
  description: [
    "搜索互联网获取当前、实时或事实性信息。",
    "当你需要训练数据之外的信息时使用此工具——",
    "近期事件、当前数据、文档查询或事实核查。",
    "返回基于完整网页内容生成的 AI 详细回答，附带来源 URL。",
    "由 DeepSeek 原生联网搜索 API 驱动（服务端执行）。",
    "",
    "English: Search the web for current, real-time, or factual information.",
    "Use this tool when you need information beyond your training cutoff —",
    "recent events, current data, documentation lookups, or fact-checking.",
    "Returns a detailed AI-generated answer based on full page content,",
    "plus source URLs. Powered by DeepSeek's native web search API.",
  ].join("\n"),
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "搜索关键词。请具体并包含相关关键词以获得更好结果。 / The search query. Be specific and include relevant keywords.",
      },
      explanation: {
        type: "string",
        description:
          "一句话解释为什么需要搜索，帮助理解上下文。 / One sentence explaining why this search is needed.",
      },
    },
    required: ["query"],
  },
};

const SERVER_INFO = {
  name: "websearch-deepseek",
  version: "1.0.0",
  description:
    "DeepSeek 原生联网搜索 MCP Server — 返回 AI 生成答案 + 来源链接",
};

// ── JSON-RPC helpers ───────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function send(id: number | string | null, result?: unknown, error?: JsonRpcResponse["error"]) {
  const resp: JsonRpcResponse = { jsonrpc: "2.0", id, ...(error ? { error } : { result }) };
  process.stdout.write(JSON.stringify(resp) + "\n");
}

// ── Request handler ────────────────────────────────────────────────────────

async function handle(req: JsonRpcRequest): Promise<void> {
  const id = req.id ?? null;

  if (req.method === "initialize") {
    send(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
    return;
  }

  if (req.method === "tools/list") {
    send(id, { tools: [TOOL_DEFINITION] });
    return;
  }

  if (req.method === "tools/call") {
    const args = (req.params as Record<string, unknown> | undefined) ?? {};
    const toolName = args.name as string | undefined;
    const toolArgs = (args.arguments as Record<string, unknown>) ?? {};

    if (toolName !== "web_search") {
      send(id, undefined, { code: -32601, message: `Unknown tool: ${toolName}` });
      return;
    }

    const query = (toolArgs.query as string)?.trim();
    if (!query) {
      send(id, { content: [{ type: "text", text: "错误：搜索关键词为空。 / Error: empty search query." }], isError: true });
      return;
    }

    const config = getConfig();
    if (!config.apiKey) {
      send(id, {
        content: [
          {
            type: "text",
            text: [
              "❌ 未配置 DeepSeek API Key。 / No DeepSeek API Key configured.",
              "",
              "请设置环境变量 DEEPSEEK_API_KEY：",
              "  export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx",
              "",
              "或通过 WEBSEARCH_API_KEY 设置：",
              "  export WEBSEARCH_API_KEY=sk-xxxxxxxxxxxxxxxx",
              "",
              "获取 API Key: https://platform.deepseek.com/",
            ].join("\n"),
          },
        ],
        isError: true,
      });
      return;
    }

    try {
      const response = await searchWeb(query, {
        apiKey: config.apiKey,
        model: config.model,
        thinking: config.thinking,
        maxTokens: config.maxTokens,
      });

      const text =
        response.results.length > 0 || response.textAnswer
          ? formatResults(query, response)
          : `Web search for "${query}" returned no results. Try rephrasing.`;

      send(id, {
        content: [{ type: "text", text }],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      send(id, {
        content: [{ type: "text", text: `Web search failed: ${message}` }],
        isError: true,
      });
    }
    return;
  }

  // Unknown method
  send(id, undefined, { code: -32601, message: `Method not found: ${req.method}` });
}

// ── Server main ────────────────────────────────────────────────────────────

function start(): void {
  const log = (...args: unknown[]) => process.stderr.write(args.map(String).join(" ") + "\n");

  const config = getConfig();
  log(`[websearch-deepseek v1.0.0] MCP server started`);
  log(`  model:    ${config.model}`);
  log(`  thinking: ${config.thinking}`);
  log(`  api key:  ${config.apiKey ? "✓ configured" : "✗ not set"}`);

  let buf = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk: string) => {
    buf += chunk;
    while (true) {
      const i = buf.indexOf("\n");
      if (i === -1) break;
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;

      try {
        const req = JSON.parse(line) as JsonRpcRequest;
        if (req.id === undefined || req.id === null) continue; // notification
        handle(req).catch((err) => {
          log("[websearch-deepseek] Error:", err);
          send(req.id ?? null, undefined, {
            code: -32603,
            message: `Internal error: ${err instanceof Error ? err.message : String(err)}`,
          });
        });
      } catch {
        log("[websearch-deepseek] Invalid JSON:", line.slice(0, 100));
      }
    }
  });

  process.stdin.on("end", () => {
    log("[websearch-deepseek] Shutting down");
    process.exit(0);
  });

  process.stdin.resume();
}

start();
