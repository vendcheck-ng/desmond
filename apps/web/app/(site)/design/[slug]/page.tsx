import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/data";
import { getDesign, getDesigns, getNextDesign } from "@/lib/designs";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/Reveal";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { buildDesignGraph, pageMetadata } from "@/lib/seo";
import "@/app/design.css";

export const revalidate = 3600;
export const dynamicParams = false;
type Props = { params: Promise<{ slug: string }> };

const pad = (n: number) => String(n).padStart(2, "0");

export function generateStaticParams() {
  return getDesigns().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = getDesign(slug);
  if (!d) return {};
  return pageMetadata({
    title: `${d.title}: ${d.kind}`,
    description: d.summary,
    path: `/design/${d.slug}`,
    image: { url: absoluteUrl(d.og.src), alt: `${d.title}: ${d.kind}` },
  });
}

export default async function DesignPage({ params }: Props) {
  const { slug } = await params;
  const d = getDesign(slug);
  if (!d) notFound();
  const [profile, next] = [await getProfile(), getNextDesign(slug)];
  const email = profile?.email ?? "midecancode@gmail.com";
  return (
    <article className="design-detail">
      <JsonLd data={buildDesignGraph(d, profile?.display_name || SITE_NAME)} />
      <header className="design-head shell">
        <p className="mono design-crumbs">
          <Link href="/design">Design</Link> / {d.title}
        </p>
        <h1 className="display">{d.title}</h1>
        <p className="lede">{d.summary}</p>
        <dl className="design-facts">
          <div>
            <dt className="mono">Type</dt>
            <dd>{d.kind}</dd>
          </div>
          {d.year && (
            <div>
              <dt className="mono">Year</dt>
              <dd>{d.year}</dd>
            </div>
          )}
          <div>
            <dt className="mono">Screens</dt>
            <dd>{d.images.length}</dd>
          </div>
          <div>
            <dt className="mono">Focus</dt>
            <dd>{d.tags.join(" · ")}</dd>
          </div>
        </dl>
      </header>

      <section className="two-col shell" aria-labelledby="ov-h">
        <h2 id="ov-h" className="mono">
          <span className="sec-no">§ 01</span> Overview
        </h2>
        <div className="prose">
          {d.overview.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>
      </section>

      <section className="two-col shell" aria-labelledby="hl-h">
        <h2 id="hl-h" className="mono">
          <span className="sec-no">§ 02</span> In the set
        </h2>
        <ul className="design-list">
          {d.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </section>

      <section className="two-col shell" aria-labelledby="sc-h">
        <h2 id="sc-h" className="mono">
          <span className="sec-no">§ 03</span> Screens
        </h2>
        <ol className="design-gallery">
          {d.images.map((img, i) => (
            <li key={img.src}>
              <Reveal>
                <figure className="design-figure">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    width={img.width}
                    height={img.height}
                    sizes="(min-width: 76rem) 56rem, 100vw"
                    priority={i === 0}
                  />
                  <figcaption className="mono">
                    Fig. {pad(i + 1)}: {img.caption}
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <div className="shell design-next">
        {next ? (
          <Link href={`/design/${next.slug}`}>
            <span className="mono">Next project</span>
            <span className="display">{next.title} →</span>
          </Link>
        ) : (
          <span />
        )}
        <a className="btn btn-primary" href={`mailto:${email}?subject=${encodeURIComponent(`Design project: ${d.title}`)}`}>
          Discuss a project like this
        </a>
      </div>
    </article>
  );
}
