/**
 * Framework-agnostic web search core.
 *
 * This module contains pure logic with no dependencies on pi, MCP, or any
 * agent framework. Import it directly in any Node.js project.
 *
 * @module
 */
import { resolveApiKey } from "./auth.js";
import type { WebSearchResult, SearchResponse } from "./types.js";
import { SearchError, SearchErrorCode } from "./types.js";

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = "https://api.deepseek.com/anthropic";
const DEFAULT_MODEL = "deepseek-v4-flash";
const MAX_TOKENS = 32768;

// ── System prompt ──────────────────────────────────────────────────────────

/**
 * System prompt that guides DeepSeek to:
 *   1. Search the web using its native tool
 *   2. Produce a detailed plain-text answer directly (no more tool calls)
 *
 * This ensures the final `text` content block contains the digested
 * information from the decrypted search results.
 */
const SEARCH_SYSTEM_PROMPT = [
  "You are a web search assistant. Follow these rules strictly:",
  "",
  "1. Use web_search to find relevant, up-to-date information for the user's query.",
  "2. After receiving search results, write a comprehensive, well-structured answer",
  "   in plain text based on what you found. Include specific details, dates, and facts.",
  "3. Do NOT output tool-call XML (no <invoke> tags).",
  "4. Do NOT call web_search again after you have results.",
  "5. Answer in the same language the user used in their query.",
  "6. If search results are poor or irrelevant, explain why and suggest better keywords.",
  "",
  "Your response must be the final answer, not another search request.",
].join("\n");

// ── Raw API types ──────────────────────────────────────────────────────────

interface ApiContentBlock {
  type: string;
  content?: Array<Record<string, unknown>>;
  text?: string;
}

interface ApiResponse {
  content?: ApiContentBlock[];
}

// ── Search options ─────────────────────────────────────────────────────────

export interface SearchOptions {
  /** DeepSeek API key. Auto-resolved if not provided. */
  apiKey?: string;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
  /** API base URL override. */
  baseUrl?: string;
  /** Model override (default: deepseek-v4-flash). */
  model?: string;
  /** Thinking mode: "enabled" or "disabled" (default: "enabled"). */
  thinking?: "enabled" | "disabled";
  /** Max tokens for the response (default: 8192). */
  maxTokens?: number;
}

/**
 * Perform a web search using DeepSeek's native web search capability.
 *
 * Uses the Anthropic-compatible API with the `web_search_20250305` tool type,
 * which triggers server-side search on DeepSeek's infrastructure.
 *
 * Now returns BOTH:
 *   - Individual search result entries (title, url, metadata)
 *   - The model's text answer based on server-side decrypted page content
 *
 * @param query - Search query string.
 * @param options - API configuration.
 * @returns SearchResponse with results and AI-generated text answer.
 */
export async function searchWeb(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResponse> {
  const apiKey = options.apiKey ?? resolveApiKey().key;
  if (!apiKey) {
    throw new SearchError(
      SearchErrorCode.MISSING_API_KEY,
      "No DeepSeek API key found. Set DEEPSEEK_API_KEY or WEBSEARCH_API_KEY.",
    );
  }

  const {
    signal,
    baseUrl = DEFAULT_BASE_URL,
    model = process.env.WEBSEARCH_MODEL || DEFAULT_MODEL,
    thinking = (process.env.WEBSEARCH_THINKING as "enabled" | "disabled") || "enabled",
    maxTokens = MAX_TOKENS,
  } = options;

  const url = `${baseUrl}/v1/messages`;

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system" as const, content: SEARCH_SYSTEM_PROMPT },
      { role: "user" as const, content: query },
    ],
    tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
    tool_choice: { type: "auto" as const },
  };

  // Add thinking config if enabled
  if (thinking === "enabled") {
    (body as Record<string, unknown>).thinking = { type: "enabled" };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new SearchError(SearchErrorCode.CANCELLED, "Search was cancelled.");
    }
    throw new SearchError(
      SearchErrorCode.NETWORK_ERROR,
      `Network error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    const errText = await response
      .text()
      .catch(() => "Unable to read error body");
    throw new SearchError(
      SearchErrorCode.API_ERROR,
      `DeepSeek API error (${response.status}): ${errText}`,
      response.status,
    );
  }

  const data = (await response.json()) as ApiResponse;
  if (!data.content || !Array.isArray(data.content)) {
    return { results: [], textAnswer: "" };
  }

  // Extract BOTH:
  //   - web_search_tool_result blocks → individual search result entries
  //   - text blocks → model's final answer (based on decrypted page content)
  const results: WebSearchResult[] = [];
  const textParts: string[] = [];

  for (const block of data.content) {
    if (block.type === "web_search_tool_result") {
      const inner = block.content;
      if (!inner) continue;
      for (const item of inner) {
        if (item.type === "web_search_result") {
          results.push({
            title: (item.title as string) || "Untitled",
            url: (item.url as string) || "",
            encrypted_content: item.encrypted_content as string | undefined,
            page_age: (item.page_age as string | null | undefined) ?? null,
          });
        }
      }
    } else if (block.type === "text") {
      const text = block.text as string | undefined;
      if (text && text.trim()) {
        textParts.push(text.trim());
      }
    }
  }

  return { results, textAnswer: textParts.join("\n\n") };
}

/**
 * Format search results into a human-readable Markdown string.
 *
 * The output has two sections:
 *   1. Model's text answer (based on server-side decrypted page content)
 *   2. Source URLs
 *
 * @param query - The original search query.
 * @param response - Full search response from searchWeb().
 */
export function formatResults(query: string, response: SearchResponse): string {
  const { results, textAnswer } = response;

  if (results.length === 0 && !textAnswer) {
    return (
      `Web search for **"${query}"** returned no results. ` +
      `Try rephrasing with more specific keywords.`
    );
  }

  const lines: string[] = [];

  // ── Section 1: Model's answer (based on decrypted page content) ──
  if (textAnswer) {
    if (textAnswer.startsWith("##") || textAnswer.startsWith("# ")) {
      lines.push(textAnswer);
    } else {
      lines.push(`## Search Results Summary`);
      lines.push("");
      lines.push(textAnswer);
    }
  }

  // ── Section 2: Source URLs ──
  if (results.length > 0) {
    if (textAnswer) {
      lines.push("");
      lines.push("---");
    }
    lines.push("");
    lines.push(`### Sources (${results.length}):`);
    lines.push("");
    for (let i = 0; i < results.length; i++) {
      const r = results[i]!;
      lines.push(`${i + 1}. [${r.title}](${r.url})`);
      if (r.page_age) {
        lines.push(`   - *${r.page_age}*`);
      }
    }
  }

  return lines.join("\n");
}
