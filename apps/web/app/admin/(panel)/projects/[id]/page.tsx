import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { UploadDropzone } from "@/components/UploadDropzone";
import { SECTION_KEYS } from "@/lib/validation";
import type { Asset, Project } from "@/lib/types";
import { archiveProject, deleteAsset, deleteProject, duplicateProject, moveAsset, replaceAsset, restoreProject, saveProject, setCover, setPublish, updateAsset } from "../../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string; confirmDelete?: string }> };

export default async function Editor({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { sb } = await requireAdmin();
  const { data } = await sb.from("projects").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as Project;
  const { data: a } = await sb.from("project_assets").select("*").eq("project_id", id).order("sort_order");
  const assets = (a ?? []) as Asset[];
  const { data: signed } = assets.length ? await sb.storage.from("media-private").createSignedUrls(assets.map((x) => x.storage_path), 3600) : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlOf = Object.fromEntries((signed ?? []).map((x) => [x.path, x.signedUrl]));
  const sec = Object.fromEntries(p.case_study.map((s) => [s.key, s.body]));
  const published = p.publish === "published";

  return (
    <>
      <p><a href="/admin">← Dashboard</a></p>
      <h1>{p.title}</h1>
      <p><span className="badge mono">{p.publish}</span> <span className="mono">Created {new Date(p.created_at).toLocaleDateString("en-GB")} · Updated {new Date(p.updated_at).toLocaleString("en-GB")}</span></p>
      {sp.ok && <Flash kind="ok">{sp.ok}</Flash>}
      {sp.error && <Flash kind="error">{sp.error}</Flash>}

      <div className="row">
        <a className="btn" href={`/admin/projects/${id}/preview`}>Preview draft</a>
        {published && <a className="btn" href={`/work/${p.slug}`} target="_blank" rel="noopener noreferrer">View live page<span className="sr-only"> (opens in a new tab)</span></a>}
        <form action={setPublish.bind(null, id, published ? "draft" : "published")}><button className="primary" type="submit">{published ? "Unpublish" : "Publish"}</button></form>
        <form action={duplicateProject.bind(null, id)}><button type="submit">Duplicate</button></form>
        {p.status === "archived"
          ? <form action={restoreProject.bind(null, id)}><button type="submit">Restore</button></form>
          : <form action={archiveProject.bind(null, id)}><button type="submit">Archive</button></form>}
        <a className="btn danger" href={`/admin/projects/${id}?confirmDelete=1#delete`}>Delete…</a>
      </div>

      {sp.confirmDelete && (
        <section id="delete" className="notice error" role="alertdialog" aria-labelledby="del-h">
          <h2 id="del-h">Permanently delete “{p.title}”?</h2>
          <p>This removes the project and all of its images. It cannot be undone. Consider Archive instead.</p>
          <form action={deleteProject.bind(null, id)} className="row">
            <button className="danger" type="submit">Yes, delete permanently</button>
            <a className="btn" href={`/admin/projects/${id}`} autoFocus>Cancel</a>
          </form>
        </section>
      )}

      <form action={saveProject.bind(null, id)}>
        <h2>Basics</h2>
        <div className="grid2">
          <div><label htmlFor="title">Title</label><input id="title" name="title" type="text" defaultValue={p.title} required maxLength={120} /></div>
          <div><label htmlFor="slug">Slug<span className="hint">Used in the URL: /work/<em>slug</em></span></label><input id="slug" name="slug" type="text" defaultValue={p.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></div>
          <div><label htmlFor="category">Category</label><input id="category" name="category" type="text" defaultValue={p.category} /></div>
          <div><label htmlFor="role">Role</label><input id="role" name="role" type="text" defaultValue={p.role} /></div>
          <div><label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={p.status}>
              <option value="live">Live</option><option value="in_progress">In progress</option><option value="concept">Concept</option><option value="archived">Archived</option>
            </select></div>
          <div><label htmlFor="sort_order">Sort order<span className="hint">Lower numbers appear first. You can also reorder on the dashboard.</span></label><input id="sort_order" name="sort_order" type="number" min={0} defaultValue={p.sort_order} /></div>
          <div><label htmlFor="start_date">Start date</label><input id="start_date" name="start_date" type="date" defaultValue={p.start_date ?? ""} /></div>
          <div><label htmlFor="end_date">Completion date</label><input id="end_date" name="end_date" type="date" defaultValue={p.end_date ?? ""} /></div>
        </div>
        <label htmlFor="summary">Short description<span className="hint">Factual, under 400 characters. Required to publish.</span></label>
        <textarea id="summary" name="summary" defaultValue={p.summary} maxLength={400} />
        <label htmlFor="external_url">Live product URL</label>
        <input id="external_url" name="external_url" type="url" defaultValue={p.external_url ?? ""} />
        <label htmlFor="tags">Technology and capability tags<span className="hint">Comma separated</span></label>
        <input id="tags" name="tags" type="text" defaultValue={p.tags.join(", ")} />
        <label htmlFor="contribution">My contribution<span className="hint">Be explicit about what you personally did versus the team or founder responsibilities.</span></label>
        <textarea id="contribution" name="contribution" defaultValue={p.contribution} maxLength={2000} />
        <label className="check"><input type="checkbox" name="featured" defaultChecked={p.featured} />Featured project</label>
        <label className="check"><input type="checkbox" name="case_study_enabled" defaultChecked={p.case_study_enabled} />This project has a published case study</label>

        <h2>Case study sections (all optional)</h2>
        <p className="hint">Separate paragraphs with a blank line. Empty sections are not shown. Only add outcomes you can substantiate.</p>
        {SECTION_KEYS.map(([key, label]) => (
          <div key={key}><label htmlFor={`sec_${key}`}>{label}</label><textarea id={`sec_${key}`} name={`sec_${key}`} defaultValue={sec[key] ?? ""} /></div>
        ))}

        <h2>SEO</h2>
        <label htmlFor="seo_title">SEO title<span className="hint">Up to 70 characters. Defaults to the project title.</span></label>
        <input id="seo_title" name="seo_title" type="text" defaultValue={p.seo_title ?? ""} maxLength={70} />
        <label htmlFor="seo_description">SEO description<span className="hint">Up to 200 characters. Defaults to the short description.</span></label>
        <textarea id="seo_description" name="seo_description" defaultValue={p.seo_description ?? ""} maxLength={200} />
        <p><SubmitButton className="primary" pending="Saving…">Save changes</SubmitButton></p>
      </form>

      <h2>Images</h2>
      <p className="hint">Uploads are stored privately. Images become public only when the project is published{p.case_study_enabled ? "" : " — and because the case study is off, only the cover image is made public"}.</p>
      <UploadDropzone projectId={id} />
      <ul className="assets">
        {assets.map((x, i) => (
          <li key={x.id} className="asset">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlOf[x.storage_path] ?? ""} alt={x.alt_text} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover" }} />
            <form action={updateAsset.bind(null, id, x.id)}>
              {p.cover_asset_id === x.id && <p><span className="badge mono">Cover</span></p>}
              <label htmlFor={`alt-${x.id}`}>Alt text<span className="hint">Describe the image for people who can’t see it. Leave empty only if purely decorative.</span></label>
              <input id={`alt-${x.id}`} name="alt_text" type="text" defaultValue={x.alt_text} />
              <label htmlFor={`cap-${x.id}`}>Caption</label>
              <input id={`cap-${x.id}`} name="caption" type="text" defaultValue={x.caption} />
              <label htmlFor={`rep-${x.id}`}>Replace image file<span className="hint">Choose a new file, then press “Replace image”. Alt text and caption are kept.</span></label>
              <input id={`rep-${x.id}`} name="replacement" type="file" accept="image/jpeg,image/png,image/webp" />
              <div className="row" style={{ marginTop: ".75rem" }}>
                <button className="primary" type="submit">Save details</button>
                <button type="submit" formAction={moveAsset.bind(null, id, x.id, "up")} disabled={i === 0} aria-label="Move image earlier">↑</button>
                <button type="submit" formAction={moveAsset.bind(null, id, x.id, "down")} disabled={i === assets.length - 1} aria-label="Move image later">↓</button>
                {p.cover_asset_id !== x.id && <button type="submit" formAction={setCover.bind(null, id, x.id)}>Make cover</button>}
                <button type="submit" formAction={replaceAsset.bind(null, id, x.id)}>Replace image</button>
                <button className="danger" type="submit" formAction={deleteAsset.bind(null, id, x.id)}>Remove</button>
              </div>
            </form>
          </li>
        ))}
        {assets.length === 0 && <li>No images yet.</li>}
      </ul>
    </>
  );
}
