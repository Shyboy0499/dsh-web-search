import { describe, it, expect, vi, afterEach } from "vitest";
import { searchWeb } from "../src/search";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("searchWeb", () => {
  it("parses a direct answer and related topics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          AbstractText: "DeepSeek is an AI company.",
          AbstractURL: "https://deepseek.ai",
          Heading: "DeepSeek",
          RelatedTopics: [{ Text: "DeepSeek V3 - a model", FirstURL: "https://deepseek.ai/v3" }],
        }),
      }),
    );
    const res = await searchWeb("deepseek");
    expect(res.query).toBe("deepseek");
    expect(res.results[0].title).toBe("DeepSeek");
    expect(res.results[0].url).toBe("https://deepseek.ai");
    expect(res.results[1].snippet).toContain("a model");
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(searchWeb("x")).rejects.toThrow("failed with status 500");
  });

  it("flattens nested topic groups", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          RelatedTopics: [{ Topics: [{ Text: "nested - topic", FirstURL: "https://nested" }] }],
        }),
      }),
    );
    const res = await searchWeb("q");
    expect(res.results[0].url).toBe("https://nested");
  });

  it("surfaces a readable network error instead of a raw TypeError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(searchWeb("x")).rejects.toThrow("Search request failed: fetch failed");
  });

  it("reports aborted searches cleanly", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("The operation was aborted.", "AbortError")),
    );
    await expect(searchWeb("x", controller.signal)).rejects.toThrow("Search was aborted");
  });

  it("dedupes a URL returned by both the direct answer and related topics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          AbstractText: "DuckDuckGo is a search engine.",
          AbstractURL: "https://duckduckgo.com/",
          Heading: "DuckDuckGo",
          RelatedTopics: [{ Text: "DuckDuckGo - privacy", FirstURL: "https://DUCKDUCKGO.COM/" }],
        }),
      }),
    );
    const res = await searchWeb("duckduckgo");
    expect(res.results).toHaveLength(1); // 大小写变体被归一后只留 direct answer 那条
  });

  it("dedupes a URL shared by a topic group and its nested topics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          RelatedTopics: [
            { Text: "Group - entry", FirstURL: "https://g.com/a" },
            { Topics: [{ Text: "Nested - entry", FirstURL: "https://g.com/a" }] },
          ],
        }),
      }),
    );
    const res = await searchWeb("q");
    expect(res.results).toHaveLength(1);
  });

  it("keeps a direct answer that has no URL alongside topic results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          AbstractText: "Answer without a URL.",
          Heading: "NoUrl",
          RelatedTopics: [{ Text: "Topic - entry", FirstURL: "https://t.com" }],
        }),
      }),
    );
    const res = await searchWeb("q");
    expect(res.results).toHaveLength(2);
    expect(res.results[0].url).toBe("");
  });
});
