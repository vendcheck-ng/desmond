import { getProfile, getPublishedProjects } from "@/lib/data";
import { getDesigns } from "@/lib/designs";
import { CERTIFICATIONS, EDUCATION, EXPERIENCE, FALLBACK_BIO } from "@/lib/cv";
import { DEFAULT_CAPABILITIES } from "@/lib/capabilities";
import { STATUS_LABEL } from "@/lib/labels";
import { nameVariants, sameAsLinks } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { formatFacts } from "@/lib/ask-core";

const TTL_MS = 5 * 60 * 1000;
let cached: { at: number; facts: string } | null = null;

/**
 * Everything AskMidey may say, assembled from the same sources as the site itself, so the
 * assistant can never drift from the pages. Cached briefly per instance to keep each chat fast.
 */
export async function loadFacts(): Promise<string> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.facts;
  const [profile, projects] = await Promise.all([getProfile(), getPublishedProjects()]);
  const s = profile?.socials ?? {};
  const name = profile?.display_name || SITE_NAME;
  const links = [
    ...sameAsLinks(s).map((url) => ({ label: /linkedin/i.test(url) ? "LinkedIn" : /github/i.test(url) ? "GitHub" : "X", url })),
  ];
  const facts = formatFacts({
    siteUrl: SITE_URL,
    name,
    nameVariants: nameVariants(name),
    descriptor: profile?.descriptor,
    location: s.location ?? profile?.location,
    timezone: s.timezone ?? profile?.timezone,
    available: profile?.available,
    availabilityNote: profile?.availability_note,
    openTo: s.open_to ?? profile?.open_to ?? [],
    email: profile?.email,
    links,
    bio: profile?.biography?.trim() || FALLBACK_BIO,
    products: projects.map((p) => ({
      title: p.title,
      role: p.role,
      status: STATUS_LABEL[p.status],
      summary: p.summary,
      siteUrl: p.external_url,
      pageUrl: `${SITE_URL}/work/${p.slug}`,
    })),
    designs: getDesigns().map((d) => ({ title: d.title, kind: d.kind, year: d.year, summary: d.summary, pageUrl: `${SITE_URL}/design/${d.slug}` })),
    experience: [...EXPERIENCE],
    education: `${EDUCATION.award}, ${EDUCATION.school} (${EDUCATION.when})`,
    certifications: [...CERTIFICATIONS],
    capabilities: profile?.capabilities?.length ? profile.capabilities : DEFAULT_CAPABILITIES,
  });
  cached = { at: Date.now(), facts };
  return facts;
}
