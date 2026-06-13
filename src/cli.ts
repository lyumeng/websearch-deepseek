#!/usr/bin/env node
/**
 * CLI interface for websearch-deepseek.
 *
 * Usable by any coding agent with bash tool access:
 *
 *   npx websearch-deepseek search "latest TypeScript features"
 *   npx websearch-deepseek search --json "Python 3.13 release notes"
 *
 * ## Environment variables
 *
 *   DEEPSEEK_API_KEY      DeepSeek API Key (required)
 *   WEBSEARCH_MODEL       模型 (default: deepseek-v4-flash)
 *   WEBSEARCH_THINKING    思考模式: enabled | disabled (default: enabled)
 *   WEBSEARCH_MAX_TOKENS  最大 token 数 (default: 8192)
 *
 * @module
 */

import { searchWeb, formatResults } from "./core";

function printHelp(): void {
  console.log(`websearch-deepseek v1.0.0 — DeepSeek 原生联网搜索 MCP Server

USAGE:
  websearch-deepseek <command> [options]

COMMANDS:
  search <query>      搜索并打印结果
  help                显示此帮助信息

OPTIONS (for search):
  --json              以 JSON 格式输出
  --model <name>      使用的模型 (default: deepseek-v4-flash)
  --no-thinking       关闭思考模式
  --max-tokens <n>    最大输出 token 数 (default: 8192)

ENVIRONMENT:
  DEEPSEEK_API_KEY     DeepSeek API Key (必填)
  WEBSEARCH_API_KEY    API Key 备选变量名
  WEBSEARCH_MODEL      默认模型
  WEBSEARCH_THINKING   思考模式: enabled | disabled
  WEBSEARCH_MAX_TOKENS 最大 token 数

EXAMPLES:
  websearch-deepseek search "Node.js LTS 版本"
  websearch-deepseek search --json "TypeScript 5.8 features"
  websearch-deepseek search --model deepseek-v4-pro "Rust latest version"`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h" || args[0] === "help") {
    printHelp();
    process.exit(0);
  }

  const command = args[0];

  if (command === "search") {
    const searchArgs = args.slice(1);
    const jsonMode = searchArgs.includes("--json");
    const noThinking = searchArgs.includes("--no-thinking");

    // Extract --model and --max-tokens
    let model: string | undefined;
    let maxTokens: number | undefined;
    const modelIdx = searchArgs.indexOf("--model");
    if (modelIdx !== -1 && modelIdx + 1 < searchArgs.length) {
      model = searchArgs[modelIdx + 1];
    }
    const mtIdx = searchArgs.indexOf("--max-tokens");
    if (mtIdx !== -1 && mtIdx + 1 < searchArgs.length) {
      const val = searchArgs[mtIdx + 1];
      if (val) maxTokens = parseInt(val, 10);
    }

    const flags = searchArgs.filter(
      (a) => !a.startsWith("--") && a !== model && a !== String(maxTokens),
    );
    const query = flags.join(" ").trim();

    if (!query) {
      console.error("错误：缺少搜索关键词。请使用 --help 查看用法。");
      process.exit(1);
    }

    try {
      const opts: { model?: string; thinking?: "enabled" | "disabled"; maxTokens?: number } = {};
      if (model) opts.model = model;
      if (noThinking) opts.thinking = "disabled";
      if (maxTokens) opts.maxTokens = maxTokens;
      const response = await searchWeb(query, opts);

      if (jsonMode) {
        console.log(
          JSON.stringify(
            {
              query,
              textAnswer: response.textAnswer,
              results: response.results,
              count: response.results.length,
            },
            null,
            2,
          ),
        );
      } else {
        console.log(formatResults(query, response));
      }

      if (response.results.length === 0 && !response.textAnswer) {
        process.exit(1);
      }
    } catch (error) {
      console.error("搜索失败:", error instanceof Error ? error.message : String(error));
      console.error("\n请确保已设置 DEEPSEEK_API_KEY 环境变量。");
      process.exit(1);
    }
    return;
  }

  console.error(`未知命令: ${command}。使用 --help 查看帮助。`);
  process.exit(1);
}

main();
