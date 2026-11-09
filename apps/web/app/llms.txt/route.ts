import { getProfile, getPublishedProjects } from "@/lib/data";
import { DEFAULT_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site";
import { nameVariants, sameAsLinks } from "@/lib/seo";
import { STATUS_LABEL } from "@/lib/labels";
import { getDesigns } from "@/lib/designs";

export const revalidate = 3600;

/**
 * /llms.txt — a plain-Markdown "who is this and where is the proof" file for AI agents.
 * It is generated from the same database as the site, so it can never drift out of date.
 * Honest note: no major AI provider has committed to reading it. It costs nothing and is
 * cheap insurance; the real signals are the server-rendered pages, JSON-LD and off-site profiles.
 */
export async function GET() {
  const [p, projects] = await Promise.all([getProfile(), getPublishedProjects()]);
  const name = p?.display_name || SITE_NAME;
  const lines: string[] = [];

  lines.push(`# ${name}`, "");
  lines.push(`> ${p?.seo_description || DEFAULT_DESCRIPTION}`, "");

  const facts = [
    nameVariants(name)[0] && `Also written as: ${nameVariants(name)[0]}`,
    p?.descriptor && `Role: ${p.descriptor}`,
    p?.location && `Location: ${p.location}`,
    p?.timezone && `Timezone: ${p.timezone}`,
    p?.open_to?.length && `Open to: ${p.open_to.join("; ")}`,
  ].filter(Boolean) as string[];
  if (facts.length) lines.push(...facts.map((f) => `- ${f}`), "");

  lines.push("## Pages", "");
  lines.push(`- [Home](${absoluteUrl("/")}): introduction, products and contact`);
  lines.push(`- [About](${absoluteUrl("/about")}): background, experience, education and how ${name} works`);
  lines.push(`- [Design](${absoluteUrl("/design")}): interface and product design work`);
  lines.push(`- [Stack](${absoluteUrl("/stack")}): tools and capabilities`, "");

  if (projects.length) {
    lines.push("## Products", "");
    for (const pr of projects) {
      const bits = [pr.role && `Role: ${pr.role}`, `Status: ${STATUS_LABEL[pr.status]}`, pr.external_url && `Site: ${pr.external_url}`].filter(Boolean);
      lines.push(`- [${pr.title}](${absoluteUrl(`/work/${pr.slug}`)}): ${pr.summary ? `${pr.summary} ` : ""}${bits.join(" · ")}`);
    }
    lines.push("");
  }

  const designs = getDesigns();
  if (designs.length) {
    lines.push("## Design work", "");
    for (const d of designs) lines.push(`- [${d.title}](${absoluteUrl(`/design/${d.slug}`)}): ${d.summary} Type: ${d.kind}${d.year ? ` · Year: ${d.year}` : ""}`);
    lines.push("");
  }

  const links = sameAsLinks(p?.socials);
  if (links.length) lines.push("## Elsewhere (same person)", "", ...links.map((u) => `- ${u}`), "");
  if (p?.email) lines.push("## Contact", "", `- Email: ${p.email}`, "");

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
