import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const publicUrl = new URL(process.env.SITE_URL || "http://localhost:4321");
const base = publicUrl.pathname.replace(/\/$/, "") || "/";

export default defineConfig({
  site: publicUrl.origin,
  base,
  output: "static",
  trailingSlash: "always",
  i18n: {
    locales: ["zh", "en"],
    defaultLocale: "zh",
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false }
  },
  integrations: [sitemap()]
});
