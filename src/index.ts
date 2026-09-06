import type { Context } from "@deepseek-ai/cordis";
import { webSearchTool } from "./tool";
import { fetchPageTool } from "./fetch-page";

export const name = "web-search";
export const inject = ["tools"];

export function apply(ctx: Context) {
  ctx.tools.register(webSearchTool);
  ctx.tools.register(fetchPageTool);
}
