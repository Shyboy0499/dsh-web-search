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
});
