import Link from "next/link";
import Image from "next/image";
import type { Design } from "@/lib/designs";
import "@/app/design.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** One link per card. The image is decorative here because the heading already names the project. */
export function DesignCard({ design, index, compact = false }: { design: Design; index: number; compact?: boolean }) {
  return (
    <Link href={`/design/${design.slug}`} className="design-card" data-compact={compact || undefined}>
      <div className="design-card-media">
        <Image
          src={design.cover.src}
          alt=""
          fill
          sizes={compact ? "(min-width: 48rem) 40vw, 100vw" : "(min-width: 52rem) 30vw, 100vw"}
          priority={index === 0 && !compact}
        />
      </div>
      <p className="mono design-card-meta">
        <span>{pad(index + 1)}</span>
        <span>{design.kind}</span>
        {design.year && <span>{design.year}</span>}
      </p>
      <h3 className="display design-card-title">{design.title}</h3>
      <p className="design-card-summary">{design.summary}</p>
      <ul className="tags" aria-label="Project type">
        {design.tags.slice(0, 3).map((t) => (
          <li key={t} className="mono">
            {t}
          </li>
        ))}
      </ul>
      <span className="mono design-card-cta">
        View project <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
