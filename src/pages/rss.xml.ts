import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getPublishedPosts } from "../lib/content";
import { routeFor } from "../lib/urls";
export const GET: APIRoute = async (context) => rss({
  title: "科研博客",
  description: "研究笔记、方法与实践。",
  site: new URL(routeFor("zh", "blog"), context.site!),
  customData: "<language>zh-CN</language>",
  trailingSlash: false,
  items: (await getPublishedPosts()).map(({ data }) => ({ title: data.title, description: data.summary, pubDate: data.publishedAt, link: new URL(routeFor(data.language, "blog", data.slug), context.site!).href, categories: [data.category, ...data.tags] }))
});
