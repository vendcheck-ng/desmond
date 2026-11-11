/**
 * GitHub contribution data for the home page.
 *
 * Two sources, tried in this order:
 *   1. GitHub's GraphQL API, if GITHUB_TOKEN is set (official and stable; a token with no scopes is enough).
 *   2. The public contributions fragment that github.com/<user> itself uses (no token, but not a
 *      documented API, so the parser is strict and returns null instead of guessing if the markup changes).
 * If both fail the page falls back to a plain chart image, so this can never break the home page.
 */

export type ContributionDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 };
export type Contributions = { total: number; days: ContributionDay[]; source: "graphql" | "public" };

const MIN_DAYS = 300; // a year is ~365 cells; fewer means the markup changed or the page was an error

const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];

/** Parses github.com/users/<name>/contributions. Counts come from the per-day tooltips. */
export function parseContributionsHtml(html: string): Contributions | null {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = /^\s*(\d[\d,]*)\s+contribution/i.exec(m[2]!);
    counts.set(m[1]!, n ? Number(n[1]!.replace(/,/g, "")) : 0);
  }
  const days: ContributionDay[] = [];
  for (const m of html.matchAll(/<td\b[^>]*\bContributionCalendar-day\b[^>]*>/g)) {
    const tag = m[0];
    const date = attr(tag, "data-date");
    const id = attr(tag, "id");
    const level = Number(attr(tag, "data-level"));
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !id || !(level >= 0 && level <= 4)) continue;
    days.push({ date, count: counts.get(id) ?? 0, level: level as ContributionDay["level"] });
  }
  if (days.length < MIN_DAYS) return null;
  days.sort((a, b) => a.date.localeCompare(b.date));
  return { total: days.reduce((s, d) => s + d.count, 0), days, source: "public" };
}

const LEVELS: Record<string, ContributionDay["level"]> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

type GraphQlResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions: number;
          weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[];
        };
      };
    } | null;
  };
};

export function parseGraphQl(json: GraphQlResponse): Contributions | null {
  const cal = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) return null;
  const days = cal.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0 }));
  if (days.length < MIN_DAYS) return null;
  return { total: cal.totalContributions, days, source: "graphql" };
}

const QUERY = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;
const CACHE_SECONDS = 6 * 60 * 60;

export async function getContributions(username: string): Promise<Contributions | null> {
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(username)) return null;
  const token = process.env.GITHUB_TOKEN;
  try {
    if (token) {
      const res = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "portfolio" },
        body: JSON.stringify({ query: QUERY, variables: { login: username } }),
        next: { revalidate: CACHE_SECONDS },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const parsed = parseGraphQl((await res.json()) as GraphQlResponse);
        if (parsed) return parsed;
      }
    }
    const res = await fetch(`https://github.com/users/${encodeURIComponent(username)}/contributions`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; portfolio)", Accept: "text/html" },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? parseContributionsHtml(await res.text()) : null;
  } catch (err) {
    console.error("[github] contributions unavailable:", err instanceof Error ? err.message : err);
    return null;
  }
}

/* ---------- helpers for the graph ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Days laid out in week columns (Sunday first); the first column is padded so weekdays line up. */
export function toWeeks(days: ContributionDay[]): (ContributionDay | null)[][] {
  if (!days.length) return [];
  const pad = utc(days[0]!.date).getUTCDay();
  const cells: (ContributionDay | null)[] = [...Array(pad).fill(null), ...days];
  const weeks: (ContributionDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** One label per month, placed on the first week that contains that month's 1st-7th, never crowded. */
export function monthLabels(weeks: (ContributionDay | null)[][]): { week: number; label: string }[] {
  const out: { week: number; label: string }[] = [];
  let last = -3;
  weeks.forEach((w, i) => {
    const first = w.find(Boolean);
    if (!first) return;
    const d = utc(first.date);
    const prev = out.length ? out[out.length - 1]!.label : "";
    const label = MONTHS[d.getUTCMonth()]!;
    if (label !== prev && i - last >= 3 && (d.getUTCDate() <= 7 || i === 0)) {
      out.push({ week: i, label });
      last = i;
    }
  });
  return out;
}

export const formatDay = (iso: string) =>
  utc(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
