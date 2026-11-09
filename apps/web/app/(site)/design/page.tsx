import type { Metadata } from "next";
import { getProfile } from "@/lib/data";
import { getFeaturedDesigns, getOtherDesigns, getDesigns } from "@/lib/designs";
import { DesignCard } from "@/components/DesignCard";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/Reveal";
import { buildDesignIndexGraph, pageMetadata } from "@/lib/seo";
import "@/app/design.css";

export const revalidate = 3600;
export const metadata: Metadata = pageMetadata({
  title: "Design",
  description:
    "Interface and product design by Desmond Odeyemi: a community app, a therapist-booking platform, a business website and more, across mobile and web.",
  path: "/design",
});

export default async function DesignIndex() {
  const profile = await getProfile();
  const email = profile?.email ?? "midecancode@gmail.com";
  const featured = getFeaturedDesigns();
  const others = getOtherDesigns();
  return (
    <>
      <JsonLd data={buildDesignIndexGraph(getDesigns())} />
      <header className="design-head shell">
        <p className="mono">Design</p>
        <h1 className="display design-title">
          Interface and <span className="em">product design.</span>
        </h1>
        <p className="lede">Earlier work across apps, platforms and websites. Each project opens to the full screens.</p>
      </header>

      <section className="design-block shell" aria-label="Featured design projects">
        <ul className="design-grid">
          {featured.map((d, i) => (
            <li key={d.slug}>
              <Reveal delay={i * 0.1}>
                <DesignCard design={d} index={i} />
              </Reveal>
            </li>
          ))}
        </ul>

        {others.length > 0 && (
          <>
            <h2 className="mono design-subhead">More design work</h2>
            <ul className="design-grid" data-compact>
              {others.map((d, i) => (
                <li key={d.slug}>
                  <Reveal delay={i * 0.1}>
                    <DesignCard design={d} index={featured.length + i} compact />
                  </Reveal>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="design-cta shell" aria-labelledby="design-cta-h">
        <h2 id="design-cta-h" className="display">
          Have something to <span className="em">design?</span>
        </h2>
        <p className="lede">Tell me about it. I’ll tell you honestly whether I can help.</p>
        <p>
          <a className="btn btn-primary" href={`mailto:${email}`}>
            Start a conversation
          </a>
        </p>
      </section>
    </>
  );
}
