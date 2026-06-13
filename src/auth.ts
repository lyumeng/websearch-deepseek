/**
 * API key resolution for the websearch-deepseek extension.
 *
 * Resolution order:
 *   1. DEEPSEEK_API_KEY environment variable (explicit override)
 *   2. pi agent's auth.json (~/.pi/agent/auth.json)
 *   3. WEBSEARCH_API_KEY environment variable (generic fallback)
 */
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";

/** Result of API key resolution. */
export interface ApiKeyResult {
  /** The resolved API key, or null if none found. */
  key: string | null;
  /** Human-readable source of the key (for error messages). */
  source: string | null;
}

/**
 * Resolve a DeepSeek API key from available sources.
 * Returns both the key and a description of where it came from.
 */
export function resolveApiKey(): ApiKeyResult {
  // 1. Explicit environment variable (highest priority)
  const envKey = process.env.DEEPSEEK_API_KEY;
  if (envKey) {
    return { key: envKey, source: "DEEPSEEK_API_KEY environment variable" };
  }

  // 2. pi agent's auth.json
  try {
    const authPath = join(homedir(), ".pi", "agent", "auth.json");
    const auth = JSON.parse(readFileSync(authPath, "utf-8")) as Record<
      string,
      unknown
    >;
    const ds = auth.deepseek as { type?: string; key?: string } | undefined;
    if (ds?.type === "api_key" && ds.key) {
      return {
        key: ds.key,
        source: "pi agent auth store (~/.pi/agent/auth.json)",
      };
    }
  } catch {
    // auth.json doesn't exist or is malformed — continue
  }

  // 3. Generic fallback environment variable
  const genericKey = process.env.WEBSEARCH_API_KEY;
  if (genericKey) {
    return {
      key: genericKey,
      source: "WEBSEARCH_API_KEY environment variable",
    };
  }

  return { key: null, source: null };
}

/**
 * Get the API key or throw a descriptive error.
 */
export function getApiKeyOrThrow(): string {
  const { key, source } = resolveApiKey();
  if (!key) {
    throw new Error(
      "No DeepSeek API key found.\n\n" +
        "The extension tried:\n" +
        "  1. DEEPSEEK_API_KEY environment variable\n" +
        "  2. pi agent's auth store (~/.pi/agent/auth.json)\n" +
        "  3. WEBSEARCH_API_KEY environment variable\n\n" +
        "To fix:\n" +
        "  - Run 'pi' and /login with DeepSeek, or\n" +
        "  - Set DEEPSEEK_API_KEY in your environment, or\n" +
        "  - Set WEBSEARCH_API_KEY in your environment",
    );
  }
  return key;
}
