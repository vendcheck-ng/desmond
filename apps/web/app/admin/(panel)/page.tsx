import { requireAdmin } from "@/lib/supabase-server";
import { STATUS_LABEL } from "@/lib/supabase";
import type { Project } from "@/lib/types";
import { createProject, moveProject } from "../actions";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function Dashboard({ searchParams }: Props) {
  const sp = await searchParams;
  const { sb } = await requireAdmin();
  const { data } = await sb.from("projects").select("*").order("sort_order").order("index_no");
  const list = (data ?? []) as Project[];
  const recent = [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);
  return (
    <>
      <h1>Dashboard</h1>
      {sp.ok && <Flash kind="ok">{sp.ok}</Flash>}
      {sp.error && <Flash kind="error">{sp.error}</Flash>}
      <div className="stats">
        <div className="stat"><b>{list.filter((p) => p.publish === "published").length}</b>Published</div>
        <div className="stat"><b>{list.filter((p) => p.publish === "draft").length}</b>Drafts</div>
        <div className="stat"><b>{list.filter((p) => p.status === "in_progress").length}</b>In progress</div>
      </div>

      <h2>Add a project</h2>
      <form action={createProject} className="row">
        <label htmlFor="title" className="sr-only">Project title</label>
        <input id="title" name="title" type="text" placeholder="Project title" required maxLength={120} style={{ maxWidth: "24rem" }} />
        <SubmitButton className="primary" pending="Creating…">Create draft</SubmitButton>
      </form>

      <h2>Projects (top = first on the site)</h2>
      <ul className="plist">
        {list.map((p, i) => (
          <li key={p.id}>
            <span>
              <span className="mono">N°{String(p.index_no).padStart(2, "0")}</span>{" "}
              <a href={`/admin/projects/${p.id}`}><strong>{p.title}</strong></a>{" "}
              <span className="badge mono">{p.publish}</span><span className="badge mono">{STATUS_LABEL[p.status]}</span>
            </span>
            <span className="row">
              <form action={moveProject.bind(null, p.id, "up")}><button type="submit" disabled={i === 0} aria-label={`Move ${p.title} up`}>↑</button></form>
              <form action={moveProject.bind(null, p.id, "down")}><button type="submit" disabled={i === list.length - 1} aria-label={`Move ${p.title} down`}>↓</button></form>
              <a className="btn" href={`/admin/projects/${p.id}`}>Edit</a>
            </span>
          </li>
        ))}
      </ul>

      <h2>Recent changes</h2>
      <ul className="plist">{recent.map((p) => <li key={p.id}><span>{p.title}</span><span className="mono">{new Date(p.updated_at).toLocaleString("en-GB")}</span></li>)}</ul>
    </>
  );
}
