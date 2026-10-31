import type { Metadata } from "next";
import { DEFAULT_DESCRIPTION, OG_DEFAULT, SITE_NAME, SITE_URL, absoluteUrl } from "./site";
import { mediaUrl } from "./media-url";
import { EDUCATION } from "./cv";
import { DEFAULT_CAPABILITIES } from "./capabilities";
import type { Profile, Project, ProfileSocials } from "./types";

/* ------------------------------------------------------------------ */
/* Metadata                                                            */
/* ------------------------------------------------------------------ */

type PageMeta = {
  /** A string gets the "— Desmond Odeyemi" template; { absolute } is used exactly as written. */
  title: string | { absolute: string };
  description: string;
  path: string;
  image?: { url: string; alt?: string } | null;
  type?: "website" | "profile";
};

/**
 * Next.js replaces (does not merge) the whole `openGraph` object when a page defines its own,
 * which silently drops the site-wide share image. Every page therefore builds its metadata here,
 * so canonical, Open Graph and Twitter tags are always complete and always agree.
 */
export function pageMetadata({ title, description, path, image, type = "website" }: PageMeta): Metadata {
  const ogTitle = typeof title === "string" ? `${title} — ${SITE_NAME}` : title.absolute;
  const img = image ? { url: image.url, alt: image.alt ?? ogTitle } : OG_DEFAULT;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...(type === "profile" ? { type: "profile" as const, firstName: "Desmond", lastName: "Odeyemi" } : { type: "website" as const }),
      siteName: SITE_NAME,
      locale: "en_NG",
      title: ogTitle,
      description,
      url: path,
      images: [img],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description, images: [img.url] },
  };
}

/* ------------------------------------------------------------------ */
/* JSON-LD                                                             */
/* ------------------------------------------------------------------ */

export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const isHttpUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v.trim());
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

/** twitter.com is now x.com; keeping one spelling avoids two "different" profiles for one person. */
const normalizeSocial = (url: string) => url.trim().replace(/^https?:\/\/(www\.)?twitter\.com\//i, "https://x.com/");

export function sameAsLinks(socials: ProfileSocials | undefined): string[] {
  if (!socials) return [];
  return uniq([socials.linkedin, socials.github, socials.x].filter(isHttpUrl).map(normalizeSocial));
}

/** "Lagos, Nigeria" → locality + country. Returns undefined when there is nothing usable. */
export function parseLocation(location: string | undefined) {
  const parts = (location ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return undefined;
  const country = parts.length > 1 ? parts[parts.length - 1]! : undefined;
  return {
    "@type": "PostalAddress",
    addressLocality: parts[0],
    ...(country ? { addressCountry: /^nigeria$/i.test(country) ? "NG" : country } : {}),
  };
}

/**
 * "Desmond Odeyemi" -> ["Odeyemi Desmond"]. Nigerian names are routinely written surname-first,
 * and people (and AI assistants) search both orders.
 */
export function nameVariants(name: string): string[] {
  const parts = name.trim().split(/\s+/);
  return parts.length === 2 ? [`${parts[1]} ${parts[0]}`] : [];
}

type ProjectLite = Pick<Project, "title" | "slug" | "summary" | "role" | "external_url">;

/** Only projects the owner says they founded become Organization nodes; nothing is inferred. */
const isFounderRole = (role: string) => /\bfounder\b/i.test(role);

export function buildPersonNode(profile: Profile | null) {
  const name = profile?.display_name || SITE_NAME;
  const caps = profile?.capabilities?.length ? profile.capabilities : DEFAULT_CAPABILITIES;
  const knowsAbout = uniq(caps.flatMap((c) => c.items)).slice(0, 24);
  const image = mediaUrl(profile?.portrait_path ?? null);
  const alternateName = nameVariants(name);
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name,
    ...(alternateName.length ? { alternateName } : {}),
    url: SITE_URL,
    description: profile?.seo_description || DEFAULT_DESCRIPTION,
    jobTitle: profile?.descriptor || "Product Engineer & Product Designer",
    ...(image ? { image } : {}),
    address: parseLocation(profile?.location),
    sameAs: sameAsLinks(profile?.socials),
    knowsAbout,
    alumniOf: { "@type": "EducationalOrganization", name: EDUCATION.school },
    // Deliberately no email/phone here: structured data is scraped by spam harvesters.
  };
}

function founderOrganizations(projects: ProjectLite[]) {
  return projects
    .filter((p) => p.external_url && isFounderRole(p.role))
    .map((p) => ({
      "@type": "Organization",
      "@id": `${SITE_URL}/#org-${p.slug}`,
      name: p.title,
      url: p.external_url!,
      founder: { "@id": PERSON_ID },
    }));
}

/**
 * One plain, server-rendered sentence that states who this is. Built from the database so it
 * stays true when the profile changes; crawlers and AI agents quote sentences like this.
 */
export function buildIntro(profile: Profile | null, projects: ProjectLite[]): string {
  const name = profile?.display_name || SITE_NAME;
  const alt = nameVariants(name)[0];
  const role = (profile?.descriptor || "Product Engineer & Product Designer").replace(/\s*&\s*/g, " and ").toLowerCase();
  const article = /^[aeiou]/.test(role) ? "an" : "a";
  const founded = projects.filter((p) => isFounderRole(p.role)).map((p) => p.title);
  const list = new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(founded);
  return [
    `${name}${alt ? ` (also written ${alt})` : ""} is ${article} ${role}${profile?.location ? ` in ${profile.location}` : ""}.`,
    founded.length ? `He is a founder of ${list}.` : "",
  ].filter(Boolean).join(" ");
}

const profilePageNode = (profile: Profile | null, path: string, name: string) => ({
  "@type": "ProfilePage",
  "@id": `${absoluteUrl(path)}#profilepage`,
  url: absoluteUrl(path),
  name,
  isPartOf: { "@id": WEBSITE_ID },
  about: { "@id": PERSON_ID },
  mainEntity: { "@id": PERSON_ID },
  ...(profile?.updated_at ? { dateModified: profile.updated_at } : {}),
});

/** Home: WebSite + Person (+ founded organizations) + the ProfilePage tying them together. */
export function buildHomeGraph(profile: Profile | null, projects: ProjectLite[], pageName: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: "en",
        publisher: { "@id": PERSON_ID },
      },
      buildPersonNode(profile),
      ...founderOrganizations(projects),
      profilePageNode(profile, "/", pageName),
    ],
  };
}

/** About: same person, described on its own ProfilePage. */
export function buildAboutGraph(profile: Profile | null) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildPersonNode(profile),
      { ...profilePageNode(profile, "/about", `About ${profile?.display_name || SITE_NAME}`), "@type": ["ProfilePage", "AboutPage"] },
      breadcrumb([["Home", "/"], ["About", "/about"]]),
    ],
  };
}

type ProjectForLd = Pick<Project, "title" | "slug" | "summary" | "tags" | "start_date" | "external_url">;

export function buildProjectGraph(project: ProjectForLd, imageUrl: string | null, personName: string) {
  const url = absoluteUrl(`/work/${project.slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `${url}#project`,
        url,
        name: project.title,
        ...(project.summary ? { description: project.summary } : {}),
        ...(imageUrl ? { image: imageUrl } : {}),
        ...(project.start_date ? { dateCreated: project.start_date } : {}),
        ...(project.tags?.length ? { keywords: project.tags.join(", ") } : {}),
        ...(project.external_url ? { sameAs: project.external_url } : {}),
        creator: { "@type": "Person", "@id": PERSON_ID, name: personName, url: SITE_URL },
      },
      breadcrumb([["Home", "/"], [project.title, `/work/${project.slug}`]]),
    ],
  };
}

function breadcrumb(items: [string, string][]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: absoluteUrl(path) })),
  };
}

/** JSON.stringify is not enough inside <script>: "</script>" or U+2028 in a bio could break out. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
