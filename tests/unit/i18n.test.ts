import { describe, expect, it } from "vitest";
import { alternateLocale, localizedPath } from "../../src/lib/i18n";
import { routeFor } from "../../src/lib/urls";

describe("localizedPath", () => {
  it("keeps Chinese at the root and prefixes English", () => {
    expect(localizedPath("zh", "/projects/demo/")).toBe("/projects/demo/");
    expect(localizedPath("en", "/projects/demo/")).toBe("/en/projects/demo/");
  });

  it("normalizes missing leading and trailing slashes", () => {
    expect(localizedPath("zh", "about")).toBe("/about/");
    expect(localizedPath("en", "about")).toBe("/en/about/");
  });
});

describe("alternateLocale", () => {
  it("switches between Chinese and English", () => {
    expect(alternateLocale("zh")).toBe("en");
    expect(alternateLocale("en")).toBe("zh");
  });
});

describe("routeFor", () => {
  it("builds localized structural and detail routes", () => {
    expect(routeFor("zh", "publications")).toBe("/publications/");
    expect(routeFor("en", "projects", "robust-fs")).toBe("/en/projects/robust-fs/");
    expect(routeFor("zh", "blog", "reproducible-experiments")).toBe("/blog/reproducible-experiments/");
  });
});
