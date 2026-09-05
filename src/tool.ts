import { defineTool } from "@deepseek-ai/dsh-tools";
import { searchWeb } from "./search";
import { formatSearchResults } from "./format";

export const webSearchTool = defineTool({
  name: "web_search",
  description:
    "Search the web and return ranked, readable results (title + URL + snippet).",
  parameters: {
    query: {
      type: "string",
      description: "The search query.",
    },
    limit: {
      type: "number",
      description: "Maximum number of results to return. Defaults to 8.",
    },
  },
  output: {
    schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        results: {
          type: "array",
          items: {
            type: "object",
            properties: { title: { type: "string" }, url: { type: "string" }, snippet: { type: "string" } },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
    render: (args, value) => [
      { type: "text", text: formatSearchResults(value as Parameters<typeof formatSearchResults>[0]) },
    ],
  },
  async execute(args, exec) {
    const { query, limit } = args ?? {};
    if (!query) throw new Error("A query is required.");
    const full = await searchWeb(query, exec.signal);
    // Clamp the result count to a sane range so callers can't ask for hundreds
    // of results and bloat the agent's context window.
    const clamped = limit == null ? full.results.length : Math.min(10, Math.max(1, Math.round(limit)));
    return { query: full.query, results: full.results.slice(0, clamped) };
  },
});
