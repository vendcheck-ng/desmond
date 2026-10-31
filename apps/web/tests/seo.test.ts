import { describe, expect, it } from "vitest";
import { normalizeSiteUrl } from "../lib/site";
import { buildHomeGraph, buildIntro, buildPersonNode, nameVariants, buildProjectGraph, parseLocation, sameAsLinks, serializeJsonLd } from "../lib/seo";
import type { Profile } from "../lib/types";

const profile = {
  display_name: "Desmond Odeyemi",
  descriptor: "Product Engineer & Designer",
  location: "Lagos, Nigeria",
  socials: { linkedin: "https://www.linkedin.com/in/desmondodeyemi", x: "https://twitter.com/midey_coder", github: "https://github.com/someone" },
  capabilities: [{ group: "Design", items: ["Figma", "Prototyping"] }, { group: "Build", items: ["React", "Figma"] }],
  portrait_path: null,
} as unknown as Profile;

describe("normalizeSiteUrl", () => {
  it("falls back to localhost only when nothing is configured", () => {
    expect(normalizeSiteUrl(undefined, undefined)).toBe("http://localhost:3000");
  });
  it("adds https and strips trailing slashes", () => {
    expect(normalizeSiteUrl("desmond.dev/")).toBe("https://desmond.dev");
    expect(normalizeSiteUrl("https://desmond.dev///")).toBe("https://desmond.dev");
  });
  it("uses Vercel's production host when the explicit URL is missing", () => {
    expect(normalizeSiteUrl("", "desmond.vercel.app")).toBe("https://desmond.vercel.app");
    expect(normalizeSiteUrl("https://desmond.dev", "desmond.vercel.app")).toBe("https://desmond.dev");
  });
});

describe("sameAsLinks", () => {
  it("normalizes twitter.com to x.com, drops junk and de-duplicates", () => {
    const links = sameAsLinks({ ...profile.socials, github: "not-a-url", linkedin: profile.socials.linkedin });
    expect(links).toEqual(["https://www.linkedin.com/in/desmondodeyemi", "https://x.com/midey_coder"]);
  });
  it("handles a missing socials object", () => expect(sameAsLinks(undefined)).toEqual([]));
});

describe("parseLocation", () => {
  it("maps Nigeria to ISO code", () => expect(parseLocation("Lagos, Nigeria")).toMatchObject({ addressLocality: "Lagos", addressCountry: "NG" }));
  it("returns undefined for empty input", () => expect(parseLocation("  ")).toBeUndefined());
});

describe("buildPersonNode", () => {
  it("never leaks the email and de-duplicates knowsAbout", () => {
    const node = buildPersonNode({ ...profile, email: "me@example.com" } as Profile);
    expect(JSON.stringify(node)).not.toContain("me@example.com");
    expect(node.knowsAbout).toEqual(["Figma", "Prototyping", "React"]);
    expect(node["@type"]).toBe("Person");
  });
});

describe("buildHomeGraph", () => {
  const projects = [
    { title: "Vendcheck", slug: "vendcheck", summary: "", role: "Founder", external_url: "https://vendcheck.ng" },
    { title: "Abiomax", slug: "abiomax", summary: "", role: "", external_url: "https://abiomax.com" },
    { title: "DropBas", slug: "dropbas", summary: "", role: "Co-founder", external_url: "https://dropbas.com" },
  ];
  it("only claims organizations the owner marked as founded, and links them to the person", () => {
    const graph = buildHomeGraph(profile, projects, "Home")["@graph"];
    const orgs = graph.filter((n) => n["@type"] === "Organization") as { name: string; founder: { "@id": string } }[];
    expect(orgs.map((o) => o.name)).toEqual(["Vendcheck", "DropBas"]);
    expect(orgs.every((o) => o.founder["@id"].endsWith("/#person"))).toBe(true);
  });
  it("includes WebSite, Person and ProfilePage", () => {
    const types = buildHomeGraph(profile, [], "Home")["@graph"].map((n) => n["@type"]);
    expect(types).toEqual(["WebSite", "Person", "ProfilePage"]);
  });
});

describe("buildProjectGraph", () => {
  it("emits a CreativeWork and breadcrumb, omitting empty fields", () => {
    const g = buildProjectGraph({ title: "Kompyn", slug: "kompyn", summary: "", tags: [], start_date: null, external_url: null }, null, "Desmond Odeyemi")["@graph"];
    expect(g.map((n) => n["@type"])).toEqual(["CreativeWork", "BreadcrumbList"]);
    expect(JSON.stringify(g[0])).not.toContain("description");
  });
});

describe("serializeJsonLd", () => {
  it("cannot be broken out of a <script> tag", () => {
    const out = serializeJsonLd({ bio: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).bio).toBe("</script><script>alert(1)</script>");
  });
});

describe("name order", () => {
  it("adds the surname-first spelling for two-word names only", () => {
    expect(nameVariants("Desmond Odeyemi")).toEqual(["Odeyemi Desmond"]);
    expect(nameVariants("Desmond Chukwuemeka Odeyemi")).toEqual([]);
  });
  it("puts it on the Person node", () => {
    expect(buildPersonNode(profile).alternateName).toEqual(["Odeyemi Desmond"]);
  });
});

describe("buildIntro", () => {
  const founders = [
    { title: "VendCheck", slug: "vendcheck", summary: "", role: "Founder", external_url: null },
    { title: "DropBas", slug: "dropbas", summary: "", role: "Co-founder", external_url: null },
    { title: "Abiomax", slug: "abiomax", summary: "", role: "", external_url: null },
  ];
  it("states name, both spellings, role, place and founded products", () => {
    expect(buildIntro(profile, founders)).toBe(
      "Desmond Odeyemi (also written Odeyemi Desmond) is a product engineer and designer in Lagos, Nigeria. He is a founder of VendCheck and DropBas.",
    );
  });
  it("degrades gracefully with no profile", () => {
    expect(buildIntro(null, [])).toBe("Desmond Odeyemi (also written Odeyemi Desmond) is a product engineer and product designer.");
  });
});
