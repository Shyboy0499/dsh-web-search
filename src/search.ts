// Web search provider layer: takes a query, returns ranked readable results.
// This module is dependency-free and deliberately isolated so it can be
// unit-tested without a live network round-trip.

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

/**
 * Query a public, keyless search endpoint (DuckDuckGo Instant Answer API uses
 * no key). This intentionally delegates to a small fetch so tests can point a
 * mock at it; the tool layer owns error/format handling.
 */
export async function searchWeb(
  query: string,
  signal?: AbortSignal,
  endpoint = "https://api.duckduckgo.com/",
): Promise<SearchResponse> {
  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_redirect", "1");
  url.searchParams.set("no_html", "1");

  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (error) {
    // Surface a readable message for DNS/network failures or aborts instead of a
    // raw TypeError/AbortError bubbling up to the agent.
    if (signal?.aborted) throw new Error("Search was aborted.", { cause: error });
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Search request failed: ${reason}`, { cause: error });
  }
  if (!res.ok) {
    throw new Error(`Search request failed with status ${res.status}`);
  }
  const data = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: unknown[];
  };

  const results: SearchResult[] = [];

  // Direct answer (if the API resolves one).
  if (data.AbstractText) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL || "",
      snippet: data.AbstractText,
    });
  }

  // Related topic groups (flat list or nested under "Topics").
  for (const topic of data.RelatedTopics ?? []) {
    if (!topic || typeof topic !== "object") continue;
    const t = topic as { Text?: string; FirstURL?: string; Topics?: unknown[] };
    if (t.Text && t.FirstURL) {
      results.push({ title: t.Text.split(" - ")[0], url: t.FirstURL, snippet: t.Text });
    } else if (Array.isArray(t.Topics)) {
      for (const sub of t.Topics) {
        const s = sub as { Text?: string; FirstURL?: string };
        if (s.Text && s.FirstURL) {
          results.push({ title: s.Text.split(" - ")[0], url: s.FirstURL, snippet: s.Text });
        }
      }
    }
  }

  return { query, results: dedupeByUrl(results) };
}

/** Drop later results that point at the same URL as an earlier one. */
export function dedupeByUrl(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const result of results) {
    const key = result.url.trim().toLowerCase();
    if (!key) {
      out.push(result);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(result);
  }
  return out;
}
