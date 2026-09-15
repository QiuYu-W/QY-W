import type { APIRoute } from "astro";
import { getPublishedPosts } from "../lib/content";
import { toSearchDocuments } from "../lib/search";
export const GET: APIRoute = async () => new Response(JSON.stringify(toSearchDocuments(
  (await getPublishedPosts()).map((post) => ({ id: post.id, ...post.data, body: post.body ?? "" }))
)), { headers: { "Content-Type": "application/json; charset=utf-8" } });
