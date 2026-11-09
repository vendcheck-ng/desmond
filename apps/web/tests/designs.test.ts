import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_DESIGNS, getDesign, getDesigns, getFeaturedDesigns, getNextDesign, getOtherDesigns } from "../lib/designs";
import { buildDesignGraph, buildDesignIndexGraph } from "../lib/seo";

const PUBLIC = join(__dirname, "..", "public");

describe("design data", () => {
  it("has unique slugs and at least one screen each", () => {
    const slugs = ALL_DESIGNS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const d of ALL_DESIGNS) expect(d.images.length).toBeGreaterThan(0);
  });
  it("gives every screen real alt text and a caption", () => {
    for (const d of ALL_DESIGNS)
      for (const img of d.images) {
        expect(img.alt.length).toBeGreaterThan(30);
        expect(img.caption.length).toBeGreaterThan(0);
      }
  });
  it("features exactly three published projects", () => {
    const featured = getFeaturedDesigns();
    expect(featured).toHaveLength(3);
    expect(featured.every((d) => d.published)).toBe(true);
  });
  it("keeps unpublished work out of every list and lookup", () => {
    const hidden = ALL_DESIGNS.filter((d) => !d.published).map((d) => d.slug);
    expect(hidden.length).toBeGreaterThan(0);
    for (const slug of hidden) {
      expect(getDesigns().some((d) => d.slug === slug)).toBe(false);
      expect(getOtherDesigns().some((d) => d.slug === slug)).toBe(false);
      expect(getDesign(slug)).toBeUndefined();
    }
  });
  it("loops next-project links through published work only", () => {
    const list = getDesigns();
    expect(getNextDesign(list[list.length - 1]!.slug)?.slug).toBe(list[0]!.slug);
    expect(getNextDesign("nope")).toBeNull();
  });
  it("has recorded sizes for every image (run `npm run import-designs` if this fails)", () => {
    for (const d of ALL_DESIGNS)
      for (const img of [...d.images, d.cover]) {
        expect(img.width).toBeGreaterThan(0);
        expect(img.height).toBeGreaterThan(0);
      }
  });
  it("points only at files that exist on disk (run `npm run import-designs` if this fails)", () => {
    for (const d of ALL_DESIGNS)
      for (const src of [d.cover.src, d.og.src, ...d.images.map((i) => i.src)]) expect(existsSync(join(PUBLIC, src)), src).toBe(true);
  });
});

describe("design structured data", () => {
  const d = getFeaturedDesigns()[0]!;
  it("emits a CreativeWork with every screen as an ImageObject and absolute URLs", () => {
    const [work, crumbs] = buildDesignGraph(d, "Desmond Odeyemi")["@graph"] as any[];
    expect(work["@type"]).toBe("CreativeWork");
    expect(work.image).toHaveLength(d.images.length);
    expect(work.image[0].contentUrl).toMatch(/^https?:\/\//);
    expect(work.creator["@id"]).toMatch(/#person$/);
    expect(crumbs.itemListElement.map((i: any) => i.name)).toEqual(["Home", "Design", d.title]);
  });
  it("lists published projects on the index page", () => {
    const [page] = buildDesignIndexGraph(getDesigns())["@graph"] as any[];
    expect(page.mainEntity.itemListElement).toHaveLength(getDesigns().length);
  });
});
