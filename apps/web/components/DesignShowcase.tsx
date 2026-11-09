import Link from "next/link";
import { getFeaturedDesigns } from "@/lib/designs";
import { DesignCard } from "@/components/DesignCard";
import { Reveal } from "@/components/Reveal";
import "@/app/design.css";

/** Home page section: the three strongest design projects, with a way into the rest. */
export function DesignShowcase() {
  const featured = getFeaturedDesigns();
  if (featured.length === 0) return null;
  return (
    <section id="design" aria-labelledby="design-h" className="design-section">
      <div className="section-head">
        <div className="shell section-head-inner">
          <h2 id="design-h" className="mono">
            <span className="sec-no">§ 03</span> Design
          </h2>
          <p className="mono products-note">Earlier work</p>
        </div>
      </div>
      <div className="shell">
        <ul className="design-grid">
          {featured.map((d, i) => (
            <li key={d.slug}>
              <Reveal delay={i * 0.1}>
                <DesignCard design={d} index={i} />
              </Reveal>
            </li>
          ))}
        </ul>
        <p className="design-more">
          <Link className="more" href="/design">
            All design work <span aria-hidden="true">→</span>
          </Link>
        </p>
      </div>
    </section>
  );
}
