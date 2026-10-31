import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAssets, getProfile, getPublishedProjects } from "@/lib/data";
import { mediaUrl } from "@/lib/supabase";
import { CaseStudy } from "@/components/CaseStudy";
import { JsonLd } from "@/components/JsonLd";
import { buildProjectGraph, pageMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPublishedProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getPublishedProjects()).find((x) => x.slug === slug);
  if (!p) return {};
  const assets = await getAssets(p.id);
  const og = assets.find((a) => a.id === (p.og_asset_id ?? p.cover_asset_id));
  return pageMetadata({
    title: p.seo_title || p.title,
    description: p.seo_description || p.summary || `${p.title}, a product by ${SITE_NAME}.`,
    path: `/work/${p.slug}`,
    // No project image yet? pageMetadata falls back to the branded site card instead of dropping og:image.
    image: og ? { url: mediaUrl(og.storage_path)!, alt: og.alt_text || p.title } : null,
  });
}

export default async function WorkPage({ params }: Props) {
  const { slug } = await params;
  const all = await getPublishedProjects();
  const i = all.findIndex((x) => x.slug === slug);
  if (i < 0) notFound();           // drafts are invisible to the public client (RLS), so they 404 here
  const p = all[i]!;
  const n = all.length > 1 ? all[(i + 1) % all.length]! : null;
  const [assets, profile] = await Promise.all([getAssets(p.id), getProfile()]);
  const cover = assets.find((a) => a.id === (p.og_asset_id ?? p.cover_asset_id));
  return (
    <>
      <JsonLd data={buildProjectGraph(p, cover ? mediaUrl(cover.storage_path) : null, profile?.display_name || SITE_NAME)} />
      <CaseStudy project={p} assets={assets} next={n ? { slug: n.slug, title: n.title } : null} />
    </>
  );
}
