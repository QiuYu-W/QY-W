import { expect, it } from "vitest";
import { profileSchema } from "../../src/lib/schemas";

const profileSavedByCms = {
  nameZh: "待填写",
  nameEn: "To be provided",
  roleZh: "待填写",
  roleEn: "To be provided",
  statementZh: "待填写",
  statementEn: "To be provided",
  bioZh: "待填写",
  bioEn: "To be provided",
  interestsZh: ["待填写"],
  interestsEn: ["To be provided"],
  portrait: "/images/placeholder-portrait.svg",
  portraitAltZh: "待填写的头像占位图",
  portraitAltEn: "To be provided portrait placeholder",
  education: [],
  email: "replace-me@example.com",
  authorAliases: []
};

it("accepts a CMS-saved profile that omits optional empty lists", () => {
  const parsed = profileSchema.parse(profileSavedByCms);

  expect(parsed).toMatchObject({
    experience: [],
    honors: [],
    service: [],
    skillsZh: [],
    skillsEn: [],
    links: []
  });
});
