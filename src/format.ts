// Result formatting: turns a SearchResponse into a compact, readable text block
// for the agent. Isolated so it can be tested independently of the fetch layer.

import type { SearchResponse } from "./search";

/** Render up to `limit` results as a plain-text block. */
export function formatSearchResults(response: SearchResponse, limit = 8): string {
  const { query, results } = response;
  if (results.length === 0) {
    return `No results found for "${query}".`;
  }
  const lines = [`Results for "${query}":`, ""];
  for (const result of results.slice(0, limit)) {
    lines.push(`- ${result.title}`);
    if (result.url) lines.push(`  ${result.url}`);
    if (result.snippet) lines.push(`  ${result.snippet}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}
