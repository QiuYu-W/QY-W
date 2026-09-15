import { localizedPath, type Locale } from "./i18n";

type RouteKind = "home" | "about" | "publications" | "projects" | "blog";

const ROUTES: Record<RouteKind, string> = {
  home: "/",
  about: "/about/",
  publications: "/publications/",
  projects: "/projects/",
  blog: "/blog/"
};

const DETAIL_ROUTES = new Set<RouteKind>(["projects", "blog"]);
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function withBase(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

export function routeFor(locale: Locale, kind: RouteKind, slug?: string): string {
  if (DETAIL_ROUTES.has(kind) && slug === "") {
    throw new Error("slug cannot be empty");
  }
  if (slug !== undefined && (!DETAIL_ROUTES.has(kind) || !SAFE_SLUG.test(slug))) {
    throw new Error("invalid slug for route");
  }
  const logicalPath = slug ? `${ROUTES[kind]}${slug}/` : ROUTES[kind];
  return withBase(localizedPath(locale, logicalPath));
}

export function assetUrl(path: string): string {
  return path.startsWith("/") ? withBase(path) : path;
}
