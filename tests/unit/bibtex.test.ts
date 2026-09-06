import { describe, expect, it } from "vitest";
import { matchPublication, mergePublication, parseBibtex } from "../../src/lib/bibtex";
import { fileStemForCitationKey, normalizeDoi } from "../../src/lib/identifiers";
import type { PublicationRecord } from "../../src/lib/schemas";

describe("publication identifiers", () => {
  it("normalizes DOI URLs and creates portable citation-key filenames", () => {
    expect(normalizeDoi("https://doi.org/10.1000/ABC.1")).toBe("10.1000/abc.1");
    expect(fileStemForCitationKey("Wang:2026_RFS")).toBe("wang-2026-rfs");
  });
});

describe("BibTeX import policy", () => {
  const imported = {
    citationKey: "new-key",
    doi: "10.1000/x",
    title: "Imported",
    authors: ["A"],
    year: 2026,
    venue: "Venue",
    type: "journal" as const
  };

  it("updates bibliographic fields but preserves CMS-owned fields idempotently", () => {
    const merged = mergePublication(imported, {
      citationKey: "old-key",
      doi: "10.1000/x",
      title: "Old",
      authors: ["B"],
      year: 2025,
      venue: "Old Venue",
      type: "preprint",
      status: "published",
      titleZh: "中文题名",
      abstractZh: "中文摘要",
      abstractEn: "English abstract",
      links: [{ label: "Code", url: "https://example.org/code" }],
      draft: false
    });

    expect(merged).toMatchObject({
      citationKey: "new-key",
      title: "Imported",
      titleZh: "中文题名",
      abstractZh: "中文摘要",
      links: [{ label: "Code", url: "https://example.org/code" }]
    });
    expect(mergePublication(imported, merged)).toEqual(merged);
  });

  it("matches DOI before citation key and otherwise falls back to the citation key", () => {
    const byKey: PublicationRecord = {
      citationKey: "incoming", doi: "10.1000/key", title: "Key", authors: ["A"], year: 2025,
      venue: "V", type: "journal", status: "published", links: [], draft: false
    };
    const byDoi: PublicationRecord = {
      citationKey: "different", doi: "10.1000/target", title: "DOI", authors: ["B"], year: 2026,
      venue: "V", type: "journal", status: "published", links: [], draft: false
    };

    expect(matchPublication({ ...imported, citationKey: "incoming", doi: "https://doi.org/10.1000/TARGET" }, [byKey, byDoi])?.title).toBe("DOI");
    expect(matchPublication({ ...imported, doi: undefined, citationKey: "INCOMING" }, [byKey])?.title).toBe("Key");
  });

  it("parses valid records into stable citation-key order and rejects missing required data by key", () => {
    const parsed = parseBibtex(`
      @article{z-last, title={Z title}, author={Doe, Jane}, year={2026}, journal={Journal Z}, doi={10.1000/Z}}
      @inproceedings{a-first, title={A title}, author={Org Team}, year={2025}, booktitle={Conf A}}
    `);

    expect(parsed.map((record) => record.citationKey)).toEqual(["a-first", "z-last"]);
    expect(parsed[0]).toMatchObject({ authors: ["Org Team"], venue: "Conf A", type: "conference" });
    expect(() => parseBibtex("@article{broken, title={Missing year}}"))
      .toThrow(/broken.*year/i);
  });
});
