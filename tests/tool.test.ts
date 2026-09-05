import { describe, it, expect, vi, afterEach } from "vitest";
import { webSearchTool } from "../src/tool";

afterEach(() => vi.restoreAllMocks());

const exec = { signal: new AbortController().signal } as never;

// searchWeb() reads DuckDuckGo's shape: RelatedTopics items carry Text + FirstURL.
function mockFetch(topics: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ RelatedTopics: topics }) }),
  );
}

describe("web_search tool", () => {
  it("requires a query", async () => {
    await expect(webSearchTool.execute({}, exec)).rejects.toThrow("query is required");
  });

  it("clamps an over-large limit to 10 and caps results", async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      Text: `result ${i} - snippet`,
      FirstURL: `https://x/${i}`,
    }));
    mockFetch(many);
    const value = (await webSearchTool.execute({ query: "q", limit: 999 }, exec)) as {
      results: unknown[];
    };
    expect(value.results.length).toBe(10);
  });

  it("floors a low limit at 1", async () => {
    mockFetch([{ Text: "a - b", FirstURL: "https://a" }]);
    const value = (await webSearchTool.execute({ query: "q", limit: 0 }, exec)) as {
      results: unknown[];
    };
    expect(value.results.length).toBe(1);
  });

  it("returns all results when no limit is given", async () => {
    mockFetch([{ Text: "a - b", FirstURL: "https://a" }, { Text: "c - d", FirstURL: "https://c" }]);
    const value = (await webSearchTool.execute({ query: "q" }, exec)) as {
      results: unknown[];
    };
    expect(value.results.length).toBe(2);
  });
});
