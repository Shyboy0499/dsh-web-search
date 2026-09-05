import type { Context } from "@deepseek-ai/cordis";
import { webSearchTool } from "./tool";

export const name = "web-search";
export const inject = ["tools"];

export function apply(ctx: Context) {
  ctx.tools.register(webSearchTool);
}
