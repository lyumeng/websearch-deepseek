/**
 * Shared types for the websearch-deepseek extension.
 */

/** A single web search result as returned by DeepSeek's API. */
export interface WebSearchResult {
  /** Title of the search result page. */
  title: string;
  /** URL of the search result page. */
  url: string;
  /** Encrypted page content (DeepSeek encrypts full content). */
  encrypted_content?: string;
  /** Age of the page (e.g., "2 days ago"). */
  page_age?: string | null;
}

/** Full response from a DeepSeek web search API call. */
export interface SearchResponse {
  /** Individual search result entries (title + url + metadata). */
  results: WebSearchResult[];
  /** Model's text answer based on server-side decrypted page content. */
  textAnswer: string;
}

/** Parameters accepted by the web_search tool. */
export interface WebSearchParams {
  /** The search query. */
  query: string;
  /** Optional explanation for why the search is needed. */
  explanation?: string;
}

/** Tool execution result content. */
export interface ToolResultContent {
  type: "text";
  text: string;
}

/** Tool execution result details (stored in session, not sent to LLM). */
export interface ToolResultDetails {
  query?: string;
  resultCount?: number;
  hasTextAnswer?: boolean;
  error?: string;
  message?: string;
}

/** Complete tool execution return value. */
export interface WebSearchToolResult {
  content: ToolResultContent[];
  details: ToolResultDetails;
}

/** Error codes for structured error handling. */
export enum SearchErrorCode {
  MISSING_API_KEY = "missing_api_key",
  EMPTY_QUERY = "empty_query",
  API_ERROR = "api_error",
  NETWORK_ERROR = "network_error",
  CANCELLED = "cancelled",
  NO_RESULTS = "no_results",
}

/** Structured error from search operations. */
export class SearchError extends Error {
  constructor(
    public readonly code: SearchErrorCode,
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "SearchError";
  }
}
