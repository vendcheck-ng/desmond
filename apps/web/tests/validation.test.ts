import { describe, expect, it } from "vitest";
import { slugify } from "../lib/slug";
import { profileSchema, projectSchema } from "../lib/validation";
import { parseCapabilities } from "../lib/capabilities";

const base = {
  title: "Vendcheck",
  slug: "vendcheck",
  summary: "",
  category: "",
  role: "",
  contribution: "",
  status: "live",
  featured: false,
  sort_order: "0",
  start_date: "",
  end_date: "",
  external_url: "",
  tags: [],
  case_study_enabled: false,
  seo_title: "",
  seo_description: "",
};
const profile = {
  display_name: "Desmond Odeyemi",
  descriptor: "Product Designer",
  headline: "Building products",
  intro: "",
  biography: "",
  location: "Lagos, Nigeria",
  timezone: "WAT / UTC+1",
  building: ["VendCheck", "Kompyn"],
  founder: ["AppVantage Solution LTD"],
  open_to: ["Contract work"],
  portrait_alt: "",
  email: "desmond@example.com",
  alternate_email: "",
  linkedin: "",
  x: "",
  github: "",
  available: false,
  availability_note: "",
  footer_copy: "",
  seo_title: "",
  seo_description: "",
};

describe("slugify", () => {
  it("normalises titles", () => {
    expect(slugify("  Drop Bas — v2! ")).toBe("drop-bas-v2");
  });
  it("strips accents", () => {
    expect(slugify("Café Atlas")).toBe("cafe-atlas");
  });
});
describe("projectSchema", () => {
  it("accepts a minimal draft and nulls empty optionals", () => {
    const r = projectSchema.parse(base);
    expect(r.external_url).toBeNull();
    expect(r.start_date).toBeNull();
  });
  it("rejects bad slugs and non-http urls", () => {
    expect(projectSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, external_url: "javascript:alert(1)" }).success).toBe(false);
  });
});
describe("profileSchema", () => {
  it("accepts editable profile context and converts empty alternate email to null", () => {
    const r = profileSchema.parse(profile);
    expect(r.building).toEqual(["VendCheck", "Kompyn"]);
    expect(r.open_to).toEqual(["Contract work"]);
    expect(r.alternate_email).toBeNull();
  });
  it("rejects an invalid alternate email", () => {
    expect(profileSchema.safeParse({ ...profile, alternate_email: "not-an-email" }).success).toBe(false);
  });
});
describe("parseCapabilities", () => {
  it("parses group | items lines", () => {
    expect(parseCapabilities("Build | React, Node.js\n\nbad line")).toEqual([
      { group: "Build", items: ["React", "Node.js"] },
    ]);
  });
});
