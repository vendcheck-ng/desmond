import { STATUS_LABEL } from "@/lib/labels";
import type { Status } from "@/lib/types";

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const line = { stroke: "var(--ink)", fill: "none", strokeWidth: 1 } as const;

function Motif({ n }: { n: number }) {
  switch (n % 4) {
    case 0:
      return (
        <g style={line}>
          <circle cx="262" cy="108" r="62" />
          <circle cx="262" cy="108" r="30" />
          <path d="M182 108h160M262 28v160" />
        </g>
      );
    case 1:
      return (
        <g style={line}>
          <rect x="192" y="50" width="130" height="90" />
          <rect x="217" y="70" width="80" height="50" />
          <path d="M192 140l-30 30M322 140l30 30M192 50l-30-20M322 50l30-20" />
        </g>
      );
    case 2:
      return (
        <g style={line}>
          <path d="M172 160c0-70 40-110 110-110" />
          <path d="M192 160c0-55 32-88 90-88" />
          <path d="M212 160c0-40 24-66 70-66" />
          <path d="M172 160h170" />
        </g>
      );
    default:
      return (
        <g style={line}>
          <path d="M182 150L262 40l80 110z" />
          <path d="M222 150l40-55 40 55" />
          <path d="M172 150h180" />
        </g>
      );
  }
}

function Glyph({ status }: { status: Status }) {
  const box = (
    <rect
      x="364"
      y="254"
      width="12"
      height="12"
      style={line}
      strokeDasharray={status === "concept" ? "3 2" : undefined}
    />
  );
  return (
    <g>
      {box}
      {status === "live" && <rect x="364" y="254" width="12" height="12" style={{ fill: "var(--ink)" }} />}
      {status === "in_progress" && <rect x="364" y="254" width="6" height="12" style={{ fill: "var(--ink)" }} />}
      {status === "archived" && <path d="M364 254l12 12M376 254l-12 12" style={line} />}
    </g>
  );
}

/** A drawn "sheet" used as the project visual until a real image is uploaded. Decorative: the title sits next to it as text. */
export function ProjectPlate({
  index,
  title,
  category,
  status,
  slug,
  ratio = "4 / 3",
}: {
  index: number;
  title: string;
  category: string;
  status: Status;
  slug: string;
  ratio?: string;
}) {
  const id = `grid-${slug}`;
  const n = String(index).padStart(2, "0");
  const size = title.length <= 10 ? 34 : title.length <= 16 ? 28 : 22;
  return (
    <div className="plate" style={{ aspectRatio: ratio }} aria-hidden="true">
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" style={{ fill: "none", stroke: "var(--ink)", strokeOpacity: 0.09 }} />
          </pattern>
        </defs>
        <rect width="400" height="300" fill={`url(#${id})`} />
        <rect x="12" y="12" width="376" height="276" style={line} />
        <path d="M6 12h12M12 6v12M394 12h-12M388 6v12M6 288h12M12 294v-12M394 288h-12M388 294v-12" style={line} />
        <Motif n={hash(slug)} />
        <text x="24" y="84" className="pl-display" style={{ fontSize: 64, fill: "var(--oxide)" }}>
          {n}
        </text>
        <text x="376" y="36" textAnchor="end" style={{ fontSize: 10, letterSpacing: 0, fill: "var(--ink)" }}>
          SHEET {n}
        </text>
        <path d="M12 226H388" style={line} />
        <text x="24" y="258" className="pl-display" style={{ fontSize: size, fill: "var(--ink)" }}>
          {title}
        </text>
        <text x="24" y="276" style={{ fontSize: 9, letterSpacing: 0, fill: "var(--ink)" }}>
          {(category || "PROJECT").toUpperCase()}
        </text>
        <text x="354" y="264" textAnchor="end" style={{ fontSize: 9, letterSpacing: 0, fill: "var(--ink)" }}>
          {STATUS_LABEL[status].toUpperCase()}
        </text>
        <Glyph status={status} />
      </svg>
    </div>
  );
}
