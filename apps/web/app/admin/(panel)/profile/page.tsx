import { requireAdmin } from "@/lib/supabase-server";
import { mediaUrl } from "@/lib/supabase";
import { DEFAULT_CAPABILITIES, formatCapabilities } from "@/lib/capabilities";
import type { Profile } from "@/lib/types";
import { saveProfile } from "../../actions";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function ProfilePage({ searchParams }: Props) {
  const sp = await searchParams;
  const { sb } = await requireAdmin();
  const { data } = await sb.from("site_profile").select("*").eq("id", 1).single();
  const p = data as Profile;
  const s = p.socials ?? {};
  const value = (direct: string | null | undefined, extra: string | string[] | undefined) =>
    direct || (typeof extra === "string" ? extra : "");
  const list = (direct: string[] | undefined, extra: string | string[] | undefined) =>
    direct?.length ? direct : Array.isArray(extra) ? extra : [];
  const caps = formatCapabilities(p.capabilities?.length ? p.capabilities : DEFAULT_CAPABILITIES);
  const field = (id: string, label: string, value: string, type = "text", hint?: string) => (
    <div>
      <label htmlFor={id}>
        {label}
        {hint && <span className="hint">{hint}</span>}
      </label>
      <input id={id} name={id} type={type} defaultValue={value} />
    </div>
  );
  return (
    <>
      <h1>Site profile</h1>
      {sp.ok && <Flash kind="ok">{sp.ok}</Flash>}
      {sp.error && <Flash kind="error">{sp.error}</Flash>}
      <form action={saveProfile} encType="multipart/form-data">
        <div className="grid2">
          {field("display_name", "Display name", p.display_name)}
          {field("descriptor", "Professional descriptor", p.descriptor)}
          {field("email", "Public email", p.email, "email")}
          {field(
            "headline",
            "Headline",
            p.headline,
            "text",
            "Wrap words in *asterisks* to show them in italic red, e.g. *thoughtful digital products*."
          )}
        </div>
        <label htmlFor="intro">Introduction</label>
        <textarea id="intro" name="intro" defaultValue={p.intro} />
        <label htmlFor="biography">
          Biography
          <span className="hint">
            Blank line between paragraphs. If empty, the About page shows a default drawn from your CV.
          </span>
        </label>
        <textarea id="biography" name="biography" defaultValue={p.biography} style={{ minHeight: "14rem" }} />

        <h2>Current context</h2>
        <div className="grid2">
          {field("location", "Based in", value(p.location, s.location))}
          {field("timezone", "Timezone", value(p.timezone, s.timezone))}
          {field("alternate_email", "Alternate email", value(p.alternate_email, s.alternate_email), "email")}
        </div>
        <label htmlFor="building">
          Building<span className="hint">One project per line.</span>
        </label>
        <textarea id="building" name="building" defaultValue={list(p.building, s.building).join("\n")} />
        <label htmlFor="founder">
          Founder<span className="hint">One company or product per line.</span>
        </label>
        <textarea id="founder" name="founder" defaultValue={list(p.founder, s.founder).join("\n")} />
        <label htmlFor="open_to">
          Open to<span className="hint">One opportunity per line.</span>
        </label>
        <textarea id="open_to" name="open_to" defaultValue={list(p.open_to, s.open_to).join("\n")} />

        <h2>Images and files</h2>
        {p.portrait_path && (
          /* eslint-disable-next-line @next/next/no-img-element */ <img
            src={mediaUrl(p.portrait_path)!}
            alt={p.portrait_alt}
            style={{ maxWidth: "12rem" }}
          />
        )}
        <label htmlFor="portrait">
          Portrait<span className="hint">JPG, PNG or WebP, up to 10 MB. Uploading replaces the current one.</span>
        </label>
        <input id="portrait" name="portrait" type="file" accept="image/jpeg,image/png,image/webp" />
        {field("portrait_alt", "Portrait alt text", p.portrait_alt)}
        <label htmlFor="cv">
          CV (PDF)
          <span className="hint">
            {p.cv_path
              ? "A CV is uploaded. Choose a new file to replace it."
              : "No CV uploaded yet — the download button appears once you add one."}
          </span>
        </label>
        <input id="cv" name="cv" type="file" accept="application/pdf" />

        <h2>Links</h2>
        <div className="grid2">
          {field("linkedin", "LinkedIn URL", s.linkedin ?? "", "url")}
          {field("x", "X (Twitter) URL", s.x ?? "", "url")}
          {field("github", "GitHub URL", s.github ?? "", "url")}
        </div>

        <h2>Availability</h2>
        <label className="check">
          <input type="checkbox" name="available" defaultChecked={p.available} />
          Show an availability indicator in the header
        </label>
        {field(
          "availability_note",
          "Availability note",
          p.availability_note,
          "text",
          "Optional, e.g. “from January”. Only claim what is true."
        )}

        <h2>Capabilities</h2>
        <label htmlFor="capabilities">
          One group per line: <code>Group | item, item, item</code>
          <span className="hint">List only what you can do competently.</span>
        </label>
        <textarea id="capabilities" name="capabilities" defaultValue={caps} style={{ minHeight: "10rem" }} />

        <h2>Footer and SEO</h2>
        {field("footer_copy", "Footer text", p.footer_copy)}
        {field("seo_title", "Default SEO title", p.seo_title ?? "")}
        <label htmlFor="seo_description">Default SEO description</label>
        <textarea id="seo_description" name="seo_description" defaultValue={p.seo_description ?? ""} />
        <p>
          <SubmitButton className="primary" pending="Saving…">
            Save profile
          </SubmitButton>
        </p>
      </form>
    </>
  );
}
