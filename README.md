# dsh-web-search

![CI](https://github.com/Shyboy0499/dsh-web-search/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/npm/l/dsh-web-search)

> Web search tool for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`).

`dsh-web-search` is a small, dependency-free DeepSeek Harness plugin that lets the
coding agent **search the web** and get back ranked, readable results (title + URL
+ snippet) through the official tool API. It uses a keyless public endpoint, so
there's nothing to configure.

## Features

| Tool         | What it does                                                        |
| ------------ | ------------------------------------------------------------------- |
| `web_search` | Query the web and return ranked results with title, URL and snippet |

## Installation

```sh
dsh plugin --profile web add dsh-web-search
```

No API key or external credentials required.

## Tool reference

### `web_search`

Search the web and get readable results.

```json
{
  "query": "deepseek harness",
  "limit": 5
}
```

Returns `{ query, results: [{ title, url, snippet }] }`.

`limit` (optional) caps how many results are returned. It is clamped to the
range **1–10** so the agent can't request an unbounded result list; defaults to
returning everything the endpoint provides (usually a handful).

Network/abort failures surface as readable messages rather than raw
`TypeError`/`AbortError`.

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

## Structure

The plugin is deliberately split so the fetch layer and the formatting layer can
be developed and tested independently:

- `src/search.ts` — fetches + parses results from the search endpoint
- `src/format.ts` — renders results as readable text for the agent
- `src/tool.ts` — the `web_search` tool definition (schemas, render, execute)
- `src/index.ts` — plugin entry point registering the tool with the harness

## License

MIT
