import { defineTool } from "@deepseek-ai/dsh-tools";
import { fetchPage } from "./fetch";

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
