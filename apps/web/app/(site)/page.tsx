import "../atlas.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { formatRange, getProfile, getPublishedProjects } from "@/lib/data";
import { mediaUrl } from "@/lib/media-url";
import { parseEmphasis, stripEmphasis } from "@/lib/emphasis";
import { AnimatedHeadline } from "@/components/AnimatedHeadline";
import { ProjectIndex } from "@/components/ProjectIndex";
import { DesignShowcase } from "@/components/DesignShowcase";
import { ContributionGraph } from "@/components/ContributionGraph";
import { getContributions } from "@/lib/github";
import { Reveal } from "@/components/Reveal";
import { CopyEmail } from "@/components/CopyEmail";
import { JsonLd } from "@/components/JsonLd";
import { buildHomeGraph, pageMetadata } from "@/lib/seo";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const p = await getProfile();
  // `||` not `??`: an empty string saved from the admin form must still fall back to a real title.
  return pageMetadata({
    title: { absolute: p?.seo_title || DEFAULT_TITLE },
    description: p?.seo_description || DEFAULT_DESCRIPTION,
    path: "/",
    type: "profile",
  });
}

const PRACTICE = [
  [
    "Understand",
    "I start with the people, systems and real-world conditions around a problem, before committing to a solution.",
  ],
  [
    "Design",
    "I shape clear, purposeful interfaces, and treat accessibility as a requirement rather than a finishing touch.",
  ],
  ["Build", "I carry the work from the first sketch to working software, weighing implementation constraints early."],
] as const;
const pad = (n: number) => String(n).padStart(2, "0");

function githubUsername(value?: string): string | null {
  try {
    const url = new URL(value ?? "");
    if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null;
    const username = url.pathname.split("/").filter(Boolean)[0];
    return username && /^[a-z\d-]{1,39}$/i.test(username) ? username : null;
  } catch {
    return null;
  }
}

function ValueChips({ items }: { items: string[] }) {
  return (
    <ul className="now-values">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default async function Home() {
  const [profile, projects] = await Promise.all([getProfile(), getPublishedProjects()]);
  const headline = profile?.headline ?? "I turn complex, real-world problems into thoughtful digital products.";
  const name = profile?.display_name ?? "Desmond Odeyemi";
  const email = profile?.email ?? "midecancode@gmail.com";
  const contact = parseEmphasis("Have a real problem *worth solving?*");
  const periods = Object.fromEntries(projects.map((p) => [p.id, formatRange(p.start_date, p.end_date, p.status)]));
  const building = profile?.building ?? [];
  const founders = profile?.founder ?? [];
  const openTo = profile?.open_to ?? [];
  const githubHandle = githubUsername(profile?.socials?.github);
  const githubUrl = githubHandle ? `https://github.com/${githubHandle}` : null;
  const contributions = githubHandle ? await getContributions(githubHandle) : null;
  return (
    <>
      <JsonLd data={buildHomeGraph(profile, projects, profile?.seo_title || DEFAULT_TITLE)} />
      <section id="intro" className="hero shell" aria-labelledby="hero-h">
        <div className="hero-top mono">
          <span>Introduction</span>
          <span>Portfolio · {pad(projects.length)} products</span>
        </div>
        <div className="hero-main">
          <p className="mono hero-eyebrow">I’m</p>
          <AnimatedHeadline id="hero-h" className="display hero-title" text={name} />
          <p className="mono hero-role">{profile?.descriptor || "Product Engineer & Designer"}</p>
          <Reveal className="hero-copy" delay={0.35}>
            <p className="hero-sub">{headline}</p>
            <p className="hero-detail">{profile?.intro}</p>
            <p className="hero-actions">
              <a className="btn btn-primary" href={`mailto:${email}`}>
                Let’s talk
              </a>
              <a className="btn btn-quiet" href="#work">
                View work
              </a>
            </p>
          </Reveal>
        </div>
        <Reveal className="hero-aside" delay={0.5}>
          <h2 id="now-heading" className="mono">
            Now
          </h2>
          <dl className="now-list">
            {profile?.location && (
              <div>
                <dt className="mono">Based in</dt>
                <dd>{profile.location}</dd>
              </div>
            )}
            {profile?.timezone && (
              <div>
                <dt className="mono">Timezone</dt>
                <dd>{profile.timezone}</dd>
              </div>
            )}
            {profile?.available && !profile.open_to?.length && (
              <div>
                <dt className="mono">Open to</dt>
                <dd>{profile.availability_note || "Projects"}</dd>
              </div>
            )}
            {building.length > 0 && (
              <div>
                <dt className="mono">Building</dt>
                <dd>
                  <ValueChips items={building} />
                </dd>
              </div>
            )}
            {founders.length > 0 && (
              <div>
                <dt className="mono">Founder</dt>
                <dd>
                  <ValueChips items={founders} />
                </dd>
              </div>
            )}
            {openTo.length > 0 && (
              <div>
                <dt className="mono">Open to</dt>
                <dd>
                  <ValueChips items={openTo} />
                </dd>
              </div>
            )}
          </dl>
        </Reveal>
      </section>

      <ProjectIndex projects={projects} periods={periods} />

      <DesignShowcase />

      <section id="github" className="github shell" aria-labelledby="github-h">
        <div className="github-header">
          <div>
            <p className="mono">GitHub · Activity</p>
            <h2 id="github-h" className="display">
              Contribution activity.
            </h2>
          </div>
          {githubUrl && (
            <a href={githubUrl} target="_blank" rel="noopener noreferrer">
              View profile <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
        {githubHandle && contributions ? (
          <ContributionGraph data={contributions} username={githubHandle} />
        ) : githubHandle ? (
          <div className="github-panel">
            <div className="github-activity-label">
              <span className="mono">Contribution activity</span>
              <span className="mono">Last year</span>
            </div>
            <div className="github-chart">
              <Image
                src={`https://ghchart.rshah.org/${encodeURIComponent(githubHandle)}`}
                alt={`GitHub contribution activity for ${githubHandle}`}
                width={1200}
                height={180}
                unoptimized
              />
            </div>
            <div className="github-legend mono" aria-hidden="true">
              <span>Less</span>
              <i />
              <i />
              <i />
              <i />
              <i />
              <span>More</span>
            </div>
          </div>
        ) : (
          <div className="github-empty mono">GitHub profile not connected</div>
        )}
      </section>

      <section id="practice" className="practice shell" aria-labelledby="practice-h">
        <h2 id="practice-h" className="mono">
          <span className="sec-no">§ 04</span> Practice
        </h2>
        <div className="practice-grid">
          {PRACTICE.map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.1}>
              <p className="mono">{pad(i + 1)}</p>
              <h3 className="display">{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </div>
        <p>
          <Link className="more" href="/about">
            More about me <span aria-hidden="true">→</span>
          </Link>
        </p>
      </section>

      <section id="contact" className="contact shell" aria-labelledby="contact-h">
        <h2 className="mono">
          <span className="sec-no">§ 05</span> Contact
        </h2>
        <Reveal>
          <p
            id="contact-h"
            className="display contact-title"
            role="heading"
            aria-level={3}
            aria-label={stripEmphasis("Have a real problem *worth solving?*")}
          >
            {contact.map((s, i) => (
              <span key={i} className={s.em ? "em" : undefined} aria-hidden="true">
                {s.text}
              </span>
            ))}
          </p>
          <p className="lede">Tell me about it. I’ll tell you honestly whether I can help.</p>
          <p>
            <a className="btn btn-primary" href={`mailto:${email}`}>
              Let’s work on it
            </a>
            {profile?.alternate_email && (
              <a className="btn btn-quiet" href={`mailto:${profile.alternate_email}`}>
                {profile.alternate_email}
              </a>
            )}
            <CopyEmail email={email} />
            {profile?.cv_path && (
              <a className="btn" href={mediaUrl(profile.cv_path)!} download>
                Download CV (PDF)
              </a>
            )}
          </p>
        </Reveal>
      </section>
    </>
  );
}
