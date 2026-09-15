export type Locale = "zh" | "en";

function normalize(path: string): string {
  const core = path.replace(/^\/+|\/+$/g, "");
  return core ? `/${core}/` : "/";
}

export function localizedPath(locale: Locale, path: string): string {
  const normalized = normalize(path);
  if (locale === "zh") return normalized;
  return normalized === "/" ? "/en/" : `/en${normalized}`;
}

export function alternateLocale(locale: Locale): Locale {
  return locale === "zh" ? "en" : "zh";
}
