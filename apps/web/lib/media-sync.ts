import type { serverClient } from "./supabase-server";
import { desiredPublicAssetIds, planSync } from "./visibility";

type SB = Awaited<ReturnType<typeof serverClient>>;
export const PRIVATE = "media-private";
export const PUBLIC = "media-public";

/**
 * Makes the public bucket match the database: copies approved assets from private → public and removes
 * anything that should no longer be public (unpublish, archive, case study off, asset deleted).
 * Runs with the admin's own session (storage RLS: admins only) — no service-role key involved.
 * Returns null on success, or an error message. Callers must surface errors, never report success.
 */
export async function syncPublicMedia(sb: SB, projectId: string): Promise<string | null> {
  const { data: p, error: e1 } = await sb.from("projects").select("id,publish,case_study_enabled,cover_asset_id,og_asset_id").eq("id", projectId).maybeSingle();
  if (e1 || !p) return e1?.message ?? "Project not found.";
  const { data: assets, error: e2 } = await sb.from("project_assets").select("id,storage_path").eq("project_id", projectId);
  if (e2) return e2.message;
  const rows = (assets ?? []) as { id: string; storage_path: string }[];
  const wantIds = desiredPublicAssetIds(p, rows);
  const want = new Set(rows.filter((r) => wantIds.has(r.id)).map((r) => r.storage_path));

  const dir = `projects/${projectId}`;
  const { data: listed, error: e3 } = await sb.storage.from(PUBLIC).list(dir, { limit: 1000 });
  if (e3) return e3.message;
  const have = new Set<string>((listed ?? []).map((o: { name: string }) => `${dir}/${o.name}`));

  const { toCopy, toRemove } = planSync(want, have);
  const errors: string[] = [];
  for (const path of toCopy) {
    const { error } = await sb.storage.from(PRIVATE).copy(path, path, { destinationBucket: PUBLIC });
    if (error) errors.push(`copy failed (${path}): ${error.message}`);
  }
  if (toRemove.length) {
    const { error } = await sb.storage.from(PUBLIC).remove(toRemove);
    if (error) errors.push(`remove failed: ${error.message}`);
  }
  return errors.length ? errors.join("; ") : null;
}
