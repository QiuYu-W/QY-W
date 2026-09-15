import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getPublishedPosts } from "../../lib/content";
import { routeFor } from "../../lib/urls";
export const GET: APIRoute = async (context) => rss({
  title: "Research blog",
  description: "Research notes, methods and practice.",
  site: new URL(routeFor("en", "blog"), context.site!),
  customData: "<language>en</language>",
  trailingSlash: false,
  items: (await getPublishedPosts("en")).map(({ data }) => ({ title: data.title, description: data.summary, pubDate: data.publishedAt, link: new URL(routeFor("en", "blog", data.slug), context.site!).href, categories: [data.category, ...data.tags] }))
});
