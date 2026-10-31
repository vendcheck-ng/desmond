"use client";
import { useEffect, useState } from "react";

/** Desktop-only index of the page's sections. The active section follows scroll. */
export function SectionRail({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => { for (const e of entries) if (e.isIntersecting) setActive(e.target.id); }, { rootMargin: "-40% 0px -55% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);
  return (
    <nav className="rail" aria-label="Page sections">
      <ol>
        {sections.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} aria-current={active === s.id ? "true" : undefined}>
              <span className="mono">{String(i + 1).padStart(2, "0")}</span>
              <span className="rail-label mono">{s.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
