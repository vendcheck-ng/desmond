"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, serverClient } from "@/lib/supabase-server";
import { slugify } from "@/lib/slug";
import { parseProjectForm, profileSchema, SECTION_KEYS } from "@/lib/validation";
import { parseCapabilities } from "@/lib/capabilities";
import { sniffType, validateUpload } from "@/lib/uploads";
import { PRIVATE, PUBLIC, syncPublicMedia } from "@/lib/media-sync";

type SB = Awaited<ReturnType<typeof requireAdmin>>["sb"];
const q = encodeURIComponent;
const refresh = () => revalidatePath("/", "layout");
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const isUuid = (v: string) => z.string().uuid().safeParse(v).success;

function back(id: string, msg: string, kind: "ok" | "error" = "ok"): never {
  redirect(`/admin/projects/${id}?${kind}=${q(msg)}`);
}
function home(msg: string, kind: "ok" | "error" = "ok"): never {
  redirect(`/admin?${kind}=${q(msg)}`);
}
function needId(id: string): void {
  if (!isUuid(id)) home("Invalid project id.", "error");
}

/** Validates (type, size, real file signature) and uploads. Returns the stored path or an error. */
async function uploadTo(
  sb: SB,
  bucket: string,
  file: File,
  dir: string,
  allowPdf = false
): Promise<{ path: string } | { error: string }> {
  const v = validateUpload(file, allowPdf);
  if (!v.ok) return { error: v.error };
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (sniffType(head) !== file.type) return { error: `${file.name}: the file contents do not match its type.` };
  const path = `${dir}/${crypto.randomUUID()}.${v.ext}`;
  const { error } = await sb.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  return error ? { error: error.message } : { path };
}

async function removeEverywhere(sb: SB, paths: string[]): Promise<string | null> {
  if (!paths.length) return null;
  const a = await sb.storage.from(PRIVATE).remove(paths);
  const b = await sb.storage.from(PUBLIC).remove(paths);
  const err = a.error ?? b.error;
  return err ? err.message : null;
}

/** Confirms the asset really belongs to this project (never trust ids from the form). */
async function ownedAsset(sb: SB, projectId: string, assetId: string) {
  if (!isUuid(assetId)) return null;
  const { data } = await sb
    .from("project_assets")
    .select("id,storage_path")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .maybeSingle();
  return (data as { id: string; storage_path: string } | null) ?? null;
}

// ---------- auth ----------
export async function signIn(fd: FormData) {
  const sb = await serverClient();
  const { data, error } = await sb.auth.signInWithPassword({
    email: str(fd, "email").trim(),
    password: str(fd, "password"),
  });
  if (error || !data.user) redirect("/admin/login?error=1");
  const { data: row } = await sb.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!row) {
    await sb.auth.signOut();
    redirect("/admin/login?denied=1");
  }
  redirect("/admin");
}
export async function signOut() {
  const sb = await serverClient();
  await sb.auth.signOut();
  redirect("/admin/login");
}

// ---------- projects ----------
export async function createProject(fd: FormData) {
  const { sb } = await requireAdmin();
  const title = str(fd, "title").trim().slice(0, 120);
  if (!title) home("Give the project a title.", "error");
  const { data: last } = await sb
    .from("projects")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const order = ((last?.[0]?.sort_order as number | undefined) ?? -1) + 1;
  const base = slugify(title) || "project";
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await sb.from("projects").insert({ title, slug, sort_order: order }).select("id").single();
    if (data) {
      refresh();
      back(data.id, "Draft created.");
    }
    if (error && error.code !== "23505") home(error.message, "error");
  }
  home("Could not create a unique slug. Try a different title.", "error");
}

export async function saveProject(id: string, fd: FormData) {
  needId(id);
  const { sb } = await requireAdmin();
  const parsed = parseProjectForm(fd);
  if (!parsed.success)
    back(id, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), "error");
  const case_study = SECTION_KEYS.map(([key]) => ({ key, body: str(fd, `sec_${key}`).trim() })).filter((s) => s.body);
  const { data, error } = await sb
    .from("projects")
    .update({ ...parsed.data, case_study })
    .eq("id", id)
    .select("id");
  if (error)
    back(id, error.code === "23505" ? "That slug is already used by another project." : error.message, "error");
  if (!data?.length) back(id, "Project not found.", "error");
  // The case-study switch changes which images may be public, so always re-sync.
  const syncErr = await syncPublicMedia(sb, id);
  refresh();
  if (syncErr) back(id, `Saved, but public images could not be synchronised: ${syncErr}`, "error");
  back(id, "Saved.");
}

export async function setPublish(id: string, state: "draft" | "published") {
  needId(id);
  const { sb } = await requireAdmin();
  if (state === "published") {
    const { data: p } = await sb.from("projects").select("title,summary").eq("id", id).maybeSingle();
    if (!p?.title || !p?.summary) back(id, "Add a title and a short summary before publishing.", "error");
  }
  const { error } = await sb
    .from("projects")
    .update({ publish: state, published_at: state === "published" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) back(id, error.message, "error");
  const syncErr = await syncPublicMedia(sb, id);
  if (syncErr && state === "published") {
    // Roll back so nothing is half-published.
    await sb.from("projects").update({ publish: "draft", published_at: null }).eq("id", id);
    await syncPublicMedia(sb, id);
    refresh();
    back(id, `Publishing failed and was rolled back: ${syncErr}`, "error");
  }
  refresh();
  if (syncErr)
    back(
      id,
      `Unpublished, but some public files could not be removed: ${syncErr}. Press Unpublish again to retry.`,
      "error"
    );
  back(
    id,
    state === "published"
      ? "Published. It is now live on the site."
      : "Unpublished. It is hidden and its public images were removed."
  );
}

export async function archiveProject(id: string) {
  needId(id);
  const { sb } = await requireAdmin();
  const { error } = await sb
    .from("projects")
    .update({ status: "archived", publish: "draft", published_at: null })
    .eq("id", id);
  if (error) back(id, error.message, "error");
  const syncErr = await syncPublicMedia(sb, id);
  refresh();
  if (syncErr)
    back(
      id,
      `Archived, but some public files could not be removed: ${syncErr}. Press Archive again to retry.`,
      "error"
    );
  back(id, "Archived. It is hidden from the public site.");
}

export async function restoreProject(id: string) {
  needId(id);
  const { sb } = await requireAdmin();
  const { data, error } = await sb
    .from("projects")
    .update({ status: "concept" })
    .eq("id", id)
    .eq("status", "archived")
    .select("id");
  if (error) back(id, error.message, "error");
  if (!data?.length) back(id, "This project is not archived.", "error");
  refresh();
  back(id, "Restored as an unpublished draft with status Concept. Set the correct status, then publish when ready.");
}

export async function duplicateProject(id: string) {
  needId(id);
  const { sb } = await requireAdmin();
  const { data: p } = await sb.from("projects").select("*").eq("id", id).maybeSingle();
  if (!p) back(id, "Project not found.", "error");
  const slug = `${p.slug}-copy-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await sb
    .from("projects")
    .insert({
      slug,
      title: `${p.title} (copy)`,
      summary: p.summary,
      category: p.category,
      role: p.role,
      contribution: p.contribution,
      status: p.status === "archived" ? "concept" : p.status,
      publish: "draft",
      featured: false,
      sort_order: p.sort_order + 1,
      start_date: p.start_date,
      end_date: p.end_date,
      external_url: p.external_url,
      tags: p.tags,
      case_study: p.case_study,
      case_study_enabled: p.case_study_enabled,
      seo_title: p.seo_title,
      seo_description: p.seo_description,
    })
    .select("id")
    .single();
  if (error || !data) back(id, error?.message ?? "Could not duplicate.", "error");
  refresh();
  back(data.id, "Duplicated as a draft (images are not copied).");
}

export async function deleteProject(id: string) {
  needId(id);
  const { sb } = await requireAdmin();
  const { data: assets, error: e0 } = await sb.from("project_assets").select("storage_path").eq("project_id", id);
  if (e0) back(id, e0.message, "error");
  // Files first: if storage cleanup fails we stop and keep the project so nothing is orphaned silently.
  const rmErr = await removeEverywhere(
    sb,
    (assets ?? []).map((a) => a.storage_path as string)
  );
  if (rmErr) back(id, `Nothing was deleted because image cleanup failed: ${rmErr}`, "error");
  const { error } = await sb.from("projects").delete().eq("id", id);
  if (error) back(id, error.message, "error");
  refresh();
  home("Project permanently deleted.");
}

export async function moveProject(id: string, dir: "up" | "down") {
  needId(id);
  const { sb } = await requireAdmin();
  const { data } = await sb.from("projects").select("id").order("sort_order").order("index_no");
  const ids = (data ?? []).map((r) => r.id as string);
  const i = ids.indexOf(id),
    j = dir === "up" ? i - 1 : i + 1;
  if (i < 0) home("Project not found.", "error");
  if (j < 0 || j >= ids.length) home("Already at the end of the list.");
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  const { error } = await sb.rpc("reorder_projects", { ids }); // one atomic statement
  if (error) home(`Could not reorder: ${error.message}`, "error");
  refresh();
  home("Order updated.");
}

// ---------- project assets ----------
/** Called from the client dropzone, one file at a time. Returns a result instead of redirecting. */
export async function uploadAsset(
  projectId: string,
  fd: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isUuid(projectId)) return { ok: false, error: "Invalid project." };
  const { sb } = await requireAdmin();
  const file = fd.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file received." };
  const { data: proj } = await sb.from("projects").select("id,cover_asset_id").eq("id", projectId).maybeSingle();
  if (!proj) return { ok: false, error: "Project not found." };

  const up = await uploadTo(sb, PRIVATE, file, `projects/${projectId}`);
  if ("error" in up) return { ok: false, error: up.error };
  const { data: last } = await sb
    .from("project_assets")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const order = ((last?.[0]?.sort_order as number | undefined) ?? -1) + 1;
  const { data: row, error } = await sb
    .from("project_assets")
    .insert({ project_id: projectId, storage_path: up.path, sort_order: order })
    .select("id")
    .single();
  if (error || !row) {
    await sb.storage.from(PRIVATE).remove([up.path]); // no orphan file
    return { ok: false, error: error?.message ?? "Could not save the image record." };
  }
  if (!proj.cover_asset_id) await sb.from("projects").update({ cover_asset_id: row.id }).eq("id", projectId);
  const syncErr = await syncPublicMedia(sb, projectId);
  refresh();
  return syncErr ? { ok: false, error: `Uploaded, but the public copy failed: ${syncErr}` } : { ok: true };
}

export async function updateAsset(projectId: string, assetId: string, fd: FormData) {
  needId(projectId);
  const { sb } = await requireAdmin();
  if (!(await ownedAsset(sb, projectId, assetId))) back(projectId, "Image not found in this project.", "error");
  const { error } = await sb
    .from("project_assets")
    .update({ alt_text: str(fd, "alt_text").trim().slice(0, 300), caption: str(fd, "caption").trim().slice(0, 300) })
    .eq("id", assetId)
    .eq("project_id", projectId);
  if (error) back(projectId, error.message, "error");
  refresh();
  back(projectId, "Image details saved.");
}

export async function moveAsset(projectId: string, assetId: string, dir: "up" | "down") {
  needId(projectId);
  const { sb } = await requireAdmin();
  const { data } = await sb.from("project_assets").select("id").eq("project_id", projectId).order("sort_order");
  const ids = (data ?? []).map((r) => r.id as string);
  const i = ids.indexOf(assetId),
    j = dir === "up" ? i - 1 : i + 1;
  if (i < 0) back(projectId, "Image not found in this project.", "error");
  if (j >= 0 && j < ids.length) {
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    const { error } = await sb.rpc("reorder_assets", { pid: projectId, ids });
    if (error) back(projectId, `Could not reorder: ${error.message}`, "error");
  }
  refresh();
  back(projectId, "Image order updated.");
}

export async function setCover(projectId: string, assetId: string) {
  needId(projectId);
  const { sb } = await requireAdmin();
  if (!(await ownedAsset(sb, projectId, assetId))) back(projectId, "Image not found in this project.", "error");
  const { error } = await sb.from("projects").update({ cover_asset_id: assetId }).eq("id", projectId);
  if (error) back(projectId, error.message, "error");
  const syncErr = await syncPublicMedia(sb, projectId); // with case study off, the cover is the only public image
  refresh();
  if (syncErr) back(projectId, `Cover set, but public images could not be synchronised: ${syncErr}`, "error");
  back(projectId, "Cover image set.");
}

export async function replaceAsset(projectId: string, assetId: string, fd: FormData) {
  needId(projectId);
  const { sb } = await requireAdmin();
  const old = await ownedAsset(sb, projectId, assetId);
  if (!old) back(projectId, "Image not found in this project.", "error");
  const file = fd.get("replacement");
  if (!(file instanceof File) || file.size === 0) back(projectId, "Choose a replacement file first.", "error");
  const up = await uploadTo(sb, PRIVATE, file as File, `projects/${projectId}`);
  if ("error" in up) back(projectId, up.error, "error");
  const { error } = await sb
    .from("project_assets")
    .update({ storage_path: up.path })
    .eq("id", assetId)
    .eq("project_id", projectId);
  if (error) {
    await sb.storage.from(PRIVATE).remove([up.path]);
    back(projectId, error.message, "error");
  }
  const rmErr = await removeEverywhere(sb, [old.storage_path]);
  const syncErr = await syncPublicMedia(sb, projectId);
  refresh();
  if (rmErr || syncErr) back(projectId, `Replaced, but cleanup was incomplete: ${rmErr ?? syncErr}`, "error");
  back(projectId, "Image replaced. Alt text and caption were kept — check they still fit.");
}

export async function deleteAsset(projectId: string, assetId: string) {
  needId(projectId);
  const { sb } = await requireAdmin();
  const a = await ownedAsset(sb, projectId, assetId);
  if (!a) back(projectId, "Image not found in this project.", "error");
  const { error } = await sb.from("project_assets").delete().eq("id", assetId).eq("project_id", projectId); // FK nulls cover/OG
  if (error) back(projectId, error.message, "error");
  const rmErr = await removeEverywhere(sb, [a.storage_path]);
  const syncErr = await syncPublicMedia(sb, projectId);
  refresh();
  if (rmErr || syncErr) back(projectId, `Image record removed, but file cleanup failed: ${rmErr ?? syncErr}`, "error");
  back(projectId, "Image removed.");
}

// ---------- site profile (portrait and CV are public by design → public bucket) ----------
export async function saveProfile(fd: FormData) {
  const { sb } = await requireAdmin();
  function fail(m: string): never {
    redirect(`/admin/profile?error=${q(m)}`);
  }
  const parsed = profileSchema.safeParse({
    display_name: str(fd, "display_name"),
    descriptor: str(fd, "descriptor"),
    headline: str(fd, "headline"),
    intro: str(fd, "intro"),
    biography: str(fd, "biography"),
    portrait_alt: str(fd, "portrait_alt"),
    email: str(fd, "email"),
    location: str(fd, "location"),
    timezone: str(fd, "timezone"),
    building: str(fd, "building")
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean),
    founder: str(fd, "founder")
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean),
    open_to: str(fd, "open_to")
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean),
    alternate_email: str(fd, "alternate_email").trim(),
    linkedin: str(fd, "linkedin"),
    x: str(fd, "x"),
    github: str(fd, "github"),
    available: fd.get("available") === "on",
    availability_note: str(fd, "availability_note"),
    footer_copy: str(fd, "footer_copy"),
    seo_title: str(fd, "seo_title"),
    seo_description: str(fd, "seo_description"),
  });
  if (!parsed.success) fail(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  const { linkedin, x, github, location, timezone, building, founder, open_to, alternate_email, ...rest } =
    parsed.data!;
  const { data: cur } = await sb.from("site_profile").select("portrait_path,cv_path,socials").eq("id", 1).single();
  const socials: Record<string, unknown> = { ...((cur?.socials as Record<string, unknown> | null) ?? {}) };
  const profileSocials = { linkedin, x, github, location, timezone, building, founder, open_to, alternate_email };
  for (const [key, value] of Object.entries(profileSocials)) {
    if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) delete socials[key];
    else socials[key] = value;
  }
  const update: Record<string, unknown> = {
    ...rest,
    socials,
    capabilities: parseCapabilities(str(fd, "capabilities")),
  };
  const stale: string[] = [],
    fresh: string[] = [];

  const portrait = fd.get("portrait");
  if (portrait instanceof File && portrait.size > 0) {
    const up = await uploadTo(sb, PUBLIC, portrait, "profile");
    if ("error" in up) fail(up.error);
    update.portrait_path = up.path;
    fresh.push(up.path);
    if (cur?.portrait_path) stale.push(cur.portrait_path as string);
  }
  const cv = fd.get("cv");
  if (cv instanceof File && cv.size > 0) {
    const up = await uploadTo(sb, PUBLIC, cv, "profile", true);
    if ("error" in up) {
      if (fresh.length) await sb.storage.from(PUBLIC).remove(fresh);
      fail(up.error);
    }
    if (!up.path.endsWith(".pdf")) {
      await sb.storage.from(PUBLIC).remove([up.path, ...fresh]);
      fail("The CV must be a PDF.");
    }
    update.cv_path = up.path;
    fresh.push(up.path);
    if (cur?.cv_path) stale.push(cur.cv_path as string);
  }
  const { error } = await sb.from("site_profile").update(update).eq("id", 1);
  if (error) {
    if (fresh.length) await sb.storage.from(PUBLIC).remove(fresh);
    fail(error.message);
  }
  if (stale.length) await sb.storage.from(PUBLIC).remove(stale); // only after the DB points at the new files
  refresh();
  redirect(`/admin/profile?ok=${q("Profile saved. Changes are live.")}`);
}
