import type { Metadata } from "next";
import { getProfile, getPublishedProjects } from "@/lib/data";
import { mediaUrl } from "@/lib/media-url";
import { Media } from "@/components/Media";
import { Reveal } from "@/components/Reveal";
import { CERTIFICATIONS, EDUCATION, EXPERIENCE, FALLBACK_BIO } from "@/lib/cv";
import { DEFAULT_CAPABILITIES } from "@/lib/capabilities";
import { JsonLd } from "@/components/JsonLd";
import { buildAboutGraph, buildIntro, pageMetadata } from "@/lib/seo";

export const revalidate = 60;
export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "Desmond Odeyemi is a product engineer and designer in Lagos, Nigeria, with a background in estate management and valuation. Background, experience and how he works.",
  path: "/about",
  type: "profile",
});

const PRINCIPLES = [
  ["Understand the problem first", "A solution committed to too early is usually a solution to the wrong problem."],
  ["Keep interfaces clear and purposeful", "Every element should earn its place."],
  ["Consider implementation early", "Constraints are design inputs, not afterthoughts."],
  ["Treat accessibility as a requirement", "If it can’t be used, it isn’t finished."],
  ["Make considered trade-offs", "Say what was given up, and why."],
  ["Improve through feedback", "Ship, listen, adjust."],
];

export default async function About() {
  const [p, projects] = await Promise.all([getProfile(), getPublishedProjects()]);
  const name = p?.display_name ?? "Desmond Odeyemi";
  const caps = p?.capabilities?.length ? p.capabilities : DEFAULT_CAPABILITIES;
  const bio = (p?.biography?.trim() || FALLBACK_BIO).split(/\n{2,}/);
  return (
    <div className="about">
      <JsonLd data={buildAboutGraph(p)} />
      <header className="about-head shell" data-has-portrait={Boolean(p?.portrait_path)}>
        <div>
          <p className="mono">About</p>
          <h1 className="display about-title">
            Understanding a product begins long before <span className="em">the interface.</span>
          </h1>
          <p className="prose prose-lg">{buildIntro(p, projects)}</p>
        </div>
        {p?.portrait_path && (
          <Reveal className="about-portrait-wrap" delay={0.2}>
            <figure className="hero-portrait">
              <div className="frame">
                <Media
                  path={p.portrait_path}
                  alt={p.portrait_alt || `Portrait of ${name}`}
                  ratio="4 / 5"
                  priority
                  sizes="(min-width: 60rem) 24rem, 90vw"
                />
              </div>
              <figcaption className="mono">Fig. 01 — {name}</figcaption>
            </figure>
          </Reveal>
        )}
      </header>

      <Reveal>
        <section className="two-col shell" aria-labelledby="bio-h">
          <h2 id="bio-h" className="mono">
            <span className="sec-no">§ 01</span> The person behind the work
          </h2>
          <div className="prose prose-lg">
            {bio.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="two-col shell" aria-labelledby="cap-h">
          <h2 id="cap-h" className="mono">
            <span className="sec-no">§ 02</span> Capabilities
          </h2>
          <div className="caps">
            {caps.map((c) => (
              <div key={c.group}>
                <h3>{c.group}</h3>
                <p>{c.items.join(" · ")}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="two-col shell" aria-labelledby="how-h">
          <h2 id="how-h" className="mono">
            <span className="sec-no">§ 03</span> How I work
          </h2>
          <ul className="plain">
            {PRINCIPLES.map(([t, d]) => (
              <li key={t}>
                <strong>{t}.</strong> {d}
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      <Reveal>
        <section className="two-col shell" aria-labelledby="exp-h">
          <h2 id="exp-h" className="mono">
            <span className="sec-no">§ 04</span> Selected experience
          </h2>
          <ul className="plain exp">
            {EXPERIENCE.map((e) => (
              <li key={e.role + e.org}>
                <strong>{e.role}</strong>, {e.org}
                <span className="mono when">{e.when}</span>
                <span className="note">{e.note}</span>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      <Reveal>
        <section className="two-col shell" aria-labelledby="edu-h">
          <h2 id="edu-h" className="mono">
            <span className="sec-no">§ 05</span> Education and certifications
          </h2>
          <div>
            <p>
              <strong>{EDUCATION.award}</strong>
              <br />
              {EDUCATION.school} <span className="mono">{EDUCATION.when}</span>
            </p>
            <p>{CERTIFICATIONS.join(" · ")}</p>
            {p?.cv_path && (
              <p>
                <a className="btn" href={mediaUrl(p.cv_path)!} download>
                  Download CV (PDF)
                </a>
              </p>
            )}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
