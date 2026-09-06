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
