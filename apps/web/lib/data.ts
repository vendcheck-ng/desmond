import { cache } from "react";
import { supabase } from "./supabase";
import type { Asset, Profile, Project, ProjectWithCover } from "./types";

/**
 * Public reads used to ignore `error`, so a Supabase hiccup rendered an empty site ("No published
 * products yet") and an empty sitemap, and ISR would then serve that for a minute or more.
 * In production we now throw instead: Next.js keeps serving the last good page when a
 * revalidation fails, so a blip never reaches visitors or crawlers.
 */
function check(scope: string, error: { message: string } | null) {
  if (!error) return;
  console.error(`[data] ${scope} failed: ${error.message}`);
  if (process.env.NODE_ENV === "production") throw new Error(`${scope} failed: ${error.message}`);
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  const { data, error } = await supabase.from("site_profile").select("*").eq("id", 1).maybeSingle();
  check("site_profile", error);
  if (!data) return null;
  const row = data as Partial<Profile>;
  const socials = row.socials ?? {};
  const asString = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");
  const asStrings = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return {
    ...row,
    location: asString(socials.location) || row.location || "",
    timezone: asString(socials.timezone) || row.timezone || "",
    building: asStrings(socials.building).length ? asStrings(socials.building) : (row.building ?? []),
    founder: asStrings(socials.founder).length ? asStrings(socials.founder) : (row.founder ?? []),
    open_to: asStrings(socials.open_to).length ? asStrings(socials.open_to) : (row.open_to ?? []),
    alternate_email: asString(socials.alternate_email) || row.alternate_email || null,
    socials,
  } as Profile;
});

export const getPublishedProjects = cache(async (): Promise<ProjectWithCover[]> => {
  const { data, error } = await supabase.from("public_projects").select("*").order("sort_order").order("index_no");
  check("public_projects", error);
  const list = (data ?? []) as Project[];
  const ids = list.map((p) => p.cover_asset_id).filter(Boolean) as string[];
  let covers: { id: string; storage_path: string; alt_text: string }[] = [];
  if (ids.length) {
    const res = await supabase.from("public_assets").select("id,storage_path,alt_text").in("id", ids);
    check("public_assets (covers)", res.error);
    covers = res.data ?? [];
  }
  return list.map((p) => {
    const c = covers.find((x) => x.id === p.cover_asset_id);
    return { ...p, cover: c ? { storage_path: c.storage_path, alt_text: c.alt_text } : null };
  });
});

export async function getAssets(projectId: string): Promise<Asset[]> {
  const { data, error } = await supabase.from("public_assets").select("*").eq("project_id", projectId).order("sort_order");
  check("public_assets", error);
  return (data ?? []) as Asset[];
}

export function formatRange(start: string | null, end: string | null, status: string): string | null {
  const f = (d: string) =>
    new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  if (start && end) return `${f(start)} – ${f(end)}`;
  if (start) return status === "in_progress" ? `${f(start)} – present` : f(start);
  return end ? f(end) : null;
}
