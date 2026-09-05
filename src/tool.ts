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
      { type: "text", text: formatSearchResults(value as Parameters<typeof formatSearchResults>[0], args?.limit) },
    ],
  },
  async execute(args, exec) {
    const { query } = args ?? {};
    if (!query) throw new Error("A query is required.");
    return searchWeb(query, exec.signal);
  },
});
