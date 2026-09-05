import { describe, it, expect } from "vitest";
import { dedupeByUrl, type SearchResult } from "../src/search";

const r = (title: string, url: string): SearchResult => ({ title, url, snippet: title });

describe("dedupeByUrl", () => {
  it("keeps only the first result per URL", () => {
    const input = [r("a", "https://x.com/1"), r("b", "https://y.com/2"), r("c", "https://x.com/1")];
    expect(dedupeByUrl(input).map((x) => x.title)).toEqual(["a", "b"]);
  });

  it("normalizes case when comparing URLs", () => {
    const input = [r("a", "https://X.com/A"), r("b", "https://x.com/a")];
    const out = dedupeByUrl(input);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("a"); // 保留首个
  });

  it("normalizes surrounding whitespace when comparing URLs", () => {
    const input = [r("a", "  https://x.com/1 "), r("b", "https://x.com/1")];
    expect(dedupeByUrl(input)).toHaveLength(1);
  });

  it("always keeps empty-URL results, even when repeated", () => {
    const input = [r("a", ""), r("b", "https://x.com"), r("c", "")];
    expect(dedupeByUrl(input).map((x) => x.title)).toEqual(["a", "b", "c"]);
  });

  it("keeps whitespace-only URLs like empty ones", () => {
    const input = [r("a", "   "), r("b", "https://x.com")];
    expect(dedupeByUrl(input).map((x) => x.title)).toEqual(["a", "b"]);
  });

  it("does not treat similar-but-different URLs as duplicates", () => {
    const input = [
      r("a", "https://x.com/1"),
      r("b", "https://x.com/1/"),
      r("c", "https://x.com/1?q=2"),
    ];
    expect(dedupeByUrl(input)).toHaveLength(3);
  });

  it("does not mutate its input", () => {
    const input = [r("a", "https://x.com"), r("b", "https://x.com")];
    dedupeByUrl(input);
    expect(input).toHaveLength(2);
  });
});
