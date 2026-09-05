import { describe, it, expect } from "vitest";
import { formatSearchResults } from "../src/format";

describe("formatSearchResults", () => {
  it("renders results with title, url, and snippet", () => {
    const out = formatSearchResults({
      query: "deepseek",
      results: [
        { title: "DeepSeek", url: "https://deepseek.ai", snippet: "An AI company." },
        { title: "DeepSeek V3", url: "https://deepseek.ai/v3", snippet: "A model." },
      ],
    });
    expect(out).toContain('Results for "deepseek"');
    expect(out).toContain("- DeepSeek");
    expect(out).toContain("https://deepseek.ai");
    expect(out).toContain("An AI company.");
  });

  it("handles the empty case", () => {
    expect(formatSearchResults({ query: "xyz", results: [] })).toContain("No results found");
  });

  it("respects the limit", () => {
    const results = Array.from({ length: 10 }, (_, i) => ({
      title: `r${i}`,
      url: `https://x/${i}`,
      snippet: "",
    }));
    const out = formatSearchResults({ query: "q", results }, 3);
    expect(out).toContain("- r0");
    expect(out).not.toContain("- r4");
  });
});
