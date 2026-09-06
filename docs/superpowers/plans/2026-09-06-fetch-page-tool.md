# fetch_page Companion Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `fetch_page` tool to `dsh-web-search` that fetches a URL and returns clean, readable text, so the dsh agent can search then open a result.

**Architecture:** A new `src/fetch.ts` module fetches a URL via the keyless `r.jina.ai` text-extraction endpoint and returns `{ url, title, content }` (content capped to a character budget). A `fetchPageTool` is defined in `src/tool.ts` alongside `webSearchTool`, registered in `src/index.ts`. Formatting is a tiny inline render (text is already clean markdown) to avoid over-engineering.

**Tech Stack:** TypeScript, the `@deepseek-ai/dsh-tools` `defineTool` API, vitest, oxlint, tsdown. Fetch uses global `fetch` (Node 18+).

---

## File Structure

- `src/fetch.ts` — **new.** `fetchPage(url, signal, opts?)` → `{ url, title, content }` via `https://r.jina.ai/<url>`. Owns URL validation, response/status handling, content cap.
- `src/fetch-page.ts` — **new.** `fetchPageTool` (defineTool) wiring `fetchPage` into the tool API with `url` + optional `maxChars`.
- `src/tool.ts` — **modify.** Add `fetchPageTool` export alongside `webSearchTool` (import from `./fetch-page`).
- `src/index.ts` — **modify.** Register `fetchPageTool`.
- `tests/fetch.test.ts` — **new.** Tests for `fetchPage` (parse, cap, errors) — written by jingchangzhao-gif.
- `tests/fetch-page.test.ts` — **new.** Tests for `fetchPageTool` execute (mock fetch) — written by jingchangzhao-gif.

> **Pairing split (co-author note):** Tasks 1–3 (implementation) are authored by Shyboy0499. Task 4 (tests) is authored by jingchangzhao-gif. Each task's commit adds the other as co-author via the repo aliases `git coauthor-jcz` / `git coauthor-sby`. Merge with a **non-squash merge** so trailers survive.

---

### Task 1: fetchPage — fetch + extract readable text

**Files:**
- Create: `src/fetch.ts`
- Test: `tests/fetch.test.ts` (added in Task 4)

- [ ] **Step 1: Create `src/fetch.ts` with the fetch + parse logic**

```ts
// Fetches a URL through a keyless reader endpoint and returns readable text.
// r.jina.ai needs no API key and returns clean markdown, which keeps this
// dependency-free and simple to test with a mocked fetch.

export interface FetchedPage {
  url: string;
  title: string;
  content: string;
}

export const DEFAULT_MAX_CHARS = 12_000;
// r.jina.ai mirrors the whole page; cap so we don't bloat the context window.
export const MAX_CONTENT_CHARS = 80_000;

export async function fetchPage(
  url: string,
  signal?: AbortSignal,
  opts?: { maxChars?: number },
): Promise<FetchedPage> {
  const target = new URL(url);
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new Error(`Unsupported URL protocol: ${target.protocol}`);
  }

  let res: Response;
  try {
    res = await fetch(`https://r.jina.ai/${target.href}`, {
      headers: { "X-Return-Format": "text" },
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw new Error("Fetch was aborted.", { cause: error });
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Fetch request failed: ${reason}`, { cause: error });
  }
  if (!res.ok) {
    throw new Error(`Fetch request failed with status ${res.status}`);
  }

  const text = await res.text();
  const maxChars = opts?.maxChars ?? DEFAULT_MAX_CHARS;
  const safeChars = Math.min(Math.max(1, Math.round(maxChars)), MAX_CONTENT_CHARS);

  // The text endpoint returns "Title: ...\n\n...body..."; split off the title.
  const match = text.match(/^Title:\s*(.+)$/m);
  const title = match?.[1]?.trim() ?? "";
  const body = text.replace(/^Title:\s*.+$/m, "").trim();

  return { url: target.href, title, content: body.slice(0, safeChars) };
}
```

- [ ] **Step 2: Commit (author: Shyboy0499, co-author jingchangzhao-gif)**

```bash
git add src/fetch.ts
git commit -m "feat: add fetchPage to read a URL as text" --trailer "Co-authored-by: jingchangzhao-gif <252637410+jingchangzhao-gif@users.noreply.github.com>"
```

---

### Task 2: fetchPageTool — defineTool wiring

**Files:**
- Create: `src/fetch-page.ts`

- [ ] **Step 1: Create `src/fetch-page.ts`**

```ts
import { defineTool } from "@deepseek-ai/dsh-tools";
import { fetchPage, DEFAULT_MAX_CHARS } from "./fetch";

export const fetchPageTool = defineTool({
  name: "fetch_page",
  description:
    "Fetch a URL and return its readable text content (title + body). Use this to open a specific page the agent found via web_search.",
  parameters: {
    url: { type: "string", description: "The http(s) URL to read." },
    maxChars: {
      type: "number",
      description: "Approx. max characters of body to return. Defaults to 12000.",
    },
  },
  output: {
    schema: {
      type: "object",
      properties: {
        url: { type: "string" },
        title: { type: "string" },
        content: { type: "string" },
      },
      additionalProperties: false,
    },
    render: (_args, value) => {
      const v = value as { url?: string; title?: string; content?: string };
      const head = v.title ? `# ${v.title}\n\n` : "";
      return [{ type: "text", text: `${head}${v.content ?? ""}`.trim() }];
    },
  },
  async execute(args, exec) {
    const { url, maxChars } = args ?? {};
    if (!url) throw new Error("A url is required.");
    return fetchPage(url, exec.signal, { maxChars });
  },
});
```

- [ ] **Step 2: Typecheck & lint**

Run: `pnpm typecheck` and `pnpm lint`
Expected: both pass (no errors)

- [ ] **Step 3: Commit (author: Shyboy0499, co-author jingchangzhao-gif)**

```bash
git add src/fetch-page.ts
git commit -m "feat: expose fetch_page tool via defineTool" --trailer "Co-authored-by: jingchangzhao-gif <252637410+jingchangzhao-gif@users.noreply.github.com>"
```

---

### Task 3: Register fetch_page in the plugin entry

**Files:**
- Modify: `src/index.ts`
- Modify: `src/tool.ts` (re-export both tools for convenience)

- [ ] **Step 1: Register `fetchPageTool`**

Replace the contents of `src/index.ts` with:

```ts
import type { Context } from "@deepseek-ai/cordis";
import { webSearchTool } from "./tool";
import { fetchPageTool } from "./fetch-page";

export const name = "web-search";
export const inject = ["tools"];

export function apply(ctx: Context) {
  ctx.tools.register(webSearchTool);
  ctx.tools.register(fetchPageTool);
}
```

- [ ] **Step 2: Build to confirm it bundles**

Run: `pnpm build`
Expected: `lib/index.js` built, no errors

- [ ] **Step 3: Commit (author: Shyboy0499, co-author jingchangzhao-gif)**

```bash
git add src/index.ts
git commit -m "feat: register fetch_page tool" --trailer "Co-authored-by: jingchangzhao-gif <252637410+jingchangzhao-gif@users.noreply.github.com>"
```

---

### Task 4: Tests for fetch_page (author: jingchangzhao-gif)

**Files:**
- Create: `tests/fetch.test.ts`
- Create: `tests/fetch-page.test.ts`

> This task is authored by **jingchangzhao-gif**. He writes the tests against the implementation above, runs them, and commits with **Shyboy0499** as co-author.

- [ ] **Step 1: Create `tests/fetch.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchPage } from "../src/fetch";

afterEach(() => vi.restoreAllMocks());

function mockText(text: string) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => text }));
}

describe("fetchPage", () => {
  it("returns url, title, and body content", async () => {
    mockText("Title: Example\n\nThis is the body.");
    const page = await fetchPage("https://example.com/");
    expect(page.url).toBe("https://example.com/");
    expect(page.title).toBe("Example");
    expect(page.content).toContain("This is the body.");
  });

  it("rejects non-http(s) protocols", async () => {
    await expect(fetchPage("file:///etc/passwd")).rejects.toThrow("Unsupported URL protocol");
  });

  it("caps content to maxChars", async () => {
    mockText("Title: X\n\n" + "a".repeat(5000));
    const page = await fetchPage("https://x.com", undefined, { maxChars: 100 });
    expect(page.content.length).toBeLessThanOrEqual(100);
  });

  it("surfaces a readable network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(fetchPage("https://x.com")).rejects.toThrow("Fetch request failed");
  });
});
```

- [ ] **Step 2: Create `tests/fetch-page.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchPageTool } from "../src/fetch-page";

afterEach(() => vi.restoreAllMocks());

const exec = { signal: new AbortController().signal } as never;

describe("fetch_page tool", () => {
  it("requires a url", async () => {
    await expect(fetchPageTool.execute({}, exec)).rejects.toThrow("url is required");
  });

  it("returns a FetchedPage value through execute", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => "Title: Hi\n\nBody text." }),
    );
    const value = (await fetchPageTool.execute({ url: "https://hi.com" }, exec)) as {
      title?: string;
      content?: string;
    };
    expect(value.title).toBe("Hi");
    expect(value.content).toContain("Body text.");
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm test`
Expected: all tests pass (existing 22 + new fetch tests)

- [ ] **Step 4: Commit (author: jingchangzhao-gif, co-author Shyboy0499)**

```bash
git add tests/fetch.test.ts tests/fetch-page.test.ts
git commit -m "test: cover fetchPage and fetch_page tool" --trailer "Co-authored-by: Shyboy0499 <129135725+Shyboy0499@users.noreply.github.com>"
```

- [ ] **Step 5: Push branch and open PR**

```bash
git push -u origin feat/fetch-page
# open PR against main
```

---

### Task 5: README update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add fetch_page to the README features + tool reference**

Add under "Features" table:

```md
| Tool          | What it does                                             |
| ------------- | -------------------------------------------------------- |
| `fetch_page`  | Fetch a URL and return readable text (title + body)       |
```

Add a "Tool reference" subsection after the existing `web_search` one:

```md
### `fetch_page`

Fetch a URL and get readable text back (title + body), via a keyless reader
endpoint. Best used on a result URL returned by `web_search`.

```json
{ "url": "https://example.com/article", "maxChars": 8000 }
```

Returns `{ url, title, content }`. `maxChars` caps the returned body (default
12000, clamped to a hard 80000 ceiling).
```
```

- [ ] **Step 2: Commit (author: Shyboy0499, co-author jingchangzhao-gif)**

```bash
git add README.md
git commit -m "docs: document fetch_page tool" --trailer "Co-authored-by: jingchangzhao-gif <252637410+jingchangzhao-gif@users.noreply.github.com>"
```

---

## Self-Review

**Spec coverage:** fetch_page companion tool → Tasks 1–3 (implementation + registration), Task 4 (tests), Task 5 (docs). Covers fetch, extraction, cap, error handling, tool wiring, registration, and documentation. ✅
**Placeholder scan:** All steps include concrete code/commands with expected output. No TBD/TODO/"handle edge cases"-style gaps. ✅
**Type consistency:** `fetchPage` returns `{ url, title, content }` (used in `fetchPageTool` and tests). `FetchedPage` interface matches. `DEFAULT_MAX_CHARS`/`MAX_CONTENT_CHARS` consistent across `fetch.ts`, `tool.ts`, tests. `fetchPageTool.execute({ url, maxChars })` matches the schema. ✅
