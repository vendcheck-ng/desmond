import { Media } from "./Media";
import { ReadingProgress } from "./ReadingProgress";
import { Reveal } from "./Reveal";
import { formatRange } from "@/lib/data";
import { STATUS_LABEL } from "@/lib/supabase";
import { SECTION_LABEL } from "@/lib/validation";
import { showsCaseStudy } from "@/lib/visibility";
import type { Asset, Project } from "@/lib/types";

const paragraphs = (t: string) => t.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>);

export function CaseStudy({ project: p, assets, next, urlFor }: { project: Project; assets: Asset[]; next?: { slug: string; title: string } | null; urlFor?: (path: string) => string | null }) {
  const study = showsCaseStudy(p);
  const media = (path: string) => (urlFor ? { src: urlFor(path), unoptimized: true } : {});
  const cover = assets.find((a) => a.id === p.cover_asset_id) ?? null;
  const gallery = study ? assets.filter((a) => a.id !== p.cover_asset_id) : [];
  const range = formatRange(p.start_date, p.end_date, p.status);
  const sections = study ? p.case_study.filter((s) => s.body.trim()) : [];
  return (
    <article className="case">
      {study && <ReadingProgress />}
      <header className="case-head shell">
        <p className="mono">N°{String(p.index_no).padStart(2, "0")}{p.category && ` · ${p.category}`}</p>
        <h1 className="display">{p.title}</h1>
        {p.summary && <p className="lede">{p.summary}</p>}
        <dl className="facts">
          <div><dt className="mono">Status</dt><dd>{STATUS_LABEL[p.status]}</dd></div>
          {p.role && <div><dt className="mono">My role</dt><dd>{p.role}</dd></div>}
          {range && <div><dt className="mono">Dates</dt><dd>{range}</dd></div>}
          {p.tags.length > 0 && <div><dt className="mono">Tools</dt><dd>{p.tags.join(", ")}</dd></div>}
        </dl>
        {p.external_url && (
          <a className="btn btn-primary" href={p.external_url} target="_blank" rel="noopener noreferrer">
            Visit {p.status === "live" ? "live product" : "site"}<span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </header>

      {cover && <figure className="case-cover shell"><Media path={cover.storage_path} alt={cover.alt_text} ratio="16 / 9" priority sizes="100vw" {...media(cover.storage_path)} />
        {cover.caption && <figcaption className="mono">{cover.caption}</figcaption>}</figure>}

      {study && p.contribution && <section className="case-sec shell"><h2 className="mono">What I did</h2><div className="prose">{paragraphs(p.contribution)}</div></section>}
      {sections.map((s) => (
        <section className="case-sec shell" key={s.key}>
          <h2 className="mono">{SECTION_LABEL[s.key] ?? s.key}</h2>
          <div className="prose">{paragraphs(s.body)}</div>
        </section>
      ))}

      {gallery.length > 0 && (
        <section className="gallery shell" aria-label="Project images">
          {gallery.map((a) => (
            <Reveal key={a.id}><figure><Media path={a.storage_path} alt={a.alt_text} {...media(a.storage_path)} />{a.caption && <figcaption className="mono">{a.caption}</figcaption>}</figure></Reveal>
          ))}
        </section>
      )}

      {next && <footer className="case-next shell"><p className="mono">Next project</p><a className="display" href={`/work/${next.slug}`}>{next.title} →</a></footer>}
    </article>
  );
}
