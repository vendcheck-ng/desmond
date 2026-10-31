import type { MetadataRoute } from "next";
import { getProfile, getPublishedProjects } from "@/lib/data";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [profile, projects] = await Promise.all([getProfile(), getPublishedProjects()]); // published only — drafts never appear
  const profileUpdated = profile?.updated_at;
  return [
    { url: absoluteUrl("/"), lastModified: profileUpdated, changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl("/about"), lastModified: profileUpdated, changeFrequency: "yearly", priority: 0.7 },
    { url: absoluteUrl("/stack"), lastModified: profileUpdated, changeFrequency: "yearly", priority: 0.6 },
    ...projects.map((p) => ({
      url: absoluteUrl(`/work/${p.slug}`),
      lastModified: p.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
