import { load } from "cheerio";
import { micromark } from "micromark";
import type { Locale } from "./i18n";
import { routeFor } from "./urls";

export type SearchablePost = { id: string; language: Locale; title: string; summary: string; body: string; slug: string; category: string; tags: string[]; draft: boolean };
export type SearchDocument = { id: string; language: Locale; title: string; summary: string; category: string; tags: string[]; url: string; text: string };

export function toSearchDocuments(posts: SearchablePost[]): SearchDocument[] {
  return posts.filter((post) => !post.draft).map((post) => {
    const source = post.body.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
    // Cheerio parses inertly; this HTML is never inserted into a browser.
    const $ = load(micromark(source, { allowDangerousHtml: true }), null, false);
    $("script, style, noscript").remove();
    $("img").each((_, element) => { $(element).replaceWith($(element).attr("alt") ?? ""); });
    $("p, div, li, pre, h1, h2, h3, h4, h5, h6, br").each((_, element) => { $(element).append(" "); });
    return { id: post.id, language: post.language, title: post.title, summary: post.summary, category: post.category, tags: [...post.tags], url: routeFor(post.language, "blog", post.slug), text: $.root().text().replace(/\s+/g, " ").trim() };
  });
}
