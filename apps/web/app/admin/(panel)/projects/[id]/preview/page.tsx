import "../../../../../site.css";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { CaseStudy } from "@/components/CaseStudy";
import type { Asset, Project } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function Preview({ params }: Props) {
  const { id } = await params;
  const { sb } = await requireAdmin();
  const { data: p } = await sb.from("projects").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  const { data: assets } = await sb.from("project_assets").select("*").eq("project_id", id).order("sort_order");
  const list = (assets ?? []) as Asset[];
  const { data: signed } = list.length ? await sb.storage.from("media-private").createSignedUrls(list.map((x) => x.storage_path), 600) : { data: [] as { path: string | null; signedUrl: string }[] };
  const urls = Object.fromEntries((signed ?? []).map((x) => [x.path, x.signedUrl]));
  return (
    <>
      <p className="notice" role="note">Preview — exactly what visitors will see once published (case-study content appears only if “published case study” is ticked). Only you can see this page. <a href={`/admin/projects/${id}`}>Back to editor</a></p>
      <CaseStudy project={p as Project} assets={list} urlFor={(path) => urls[path] ?? null} />
    </>
  );
}
