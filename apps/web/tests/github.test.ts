import { describe, expect, it } from "vitest";
import { monthLabels, parseContributionsHtml, parseGraphQl, toWeeks } from "../lib/github";

/** Builds markup shaped like github.com/users/<name>/contributions: a day cell plus a tooltip per day. */
function fixture(start: string, days: number, countFor: (i: number) => number) {
  let html = '<h2>placeholder</h2><table><tbody>';
  const d = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    const iso = new Date(d.getTime() + i * 86400000).toISOString().slice(0, 10);
    const c = countFor(i);
    const level = c === 0 ? 0 : c < 3 ? 1 : c < 6 ? 2 : c < 9 ? 3 : 4;
    html += `<td tabindex="0" data-ix="${i}" style="width: 10px" data-date="${iso}" id="contribution-day-component-${i % 7}-${Math.floor(i / 7)}" data-level="${level}" role="gridcell" class="ContributionCalendar-day"></td>`;
    html += `<tool-tip for="contribution-day-component-${i % 7}-${Math.floor(i / 7)}" popover="manual">${c === 0 ? `No contributions on ${iso}.` : `${c} contribution${c === 1 ? "" : "s"} on ${iso}.`}</tool-tip>`;
  }
  return html + "</tbody></table>";
}

describe("parseContributionsHtml", () => {
  // Sunday 2025-11-09, 365 days; 2 contributions on every 10th day.
  const html = fixture("2025-11-09", 365, (i) => (i % 10 === 0 ? 2 : 0));
  it("reads dates, counts and levels, and totals the counts", () => {
    const r = parseContributionsHtml(html)!;
    expect(r.days).toHaveLength(365);
    expect(r.total).toBe(2 * 37);
    expect(r.days[0]).toEqual({ date: "2025-11-09", count: 2, level: 1 });
    expect(r.days[1]).toEqual({ date: "2025-11-10", count: 0, level: 0 });
    expect(r.source).toBe("public");
  });
  it("parses thousands separators in tooltips", () => {
    const r = parseContributionsHtml(fixture("2025-11-09", 365, (i) => (i === 0 ? 1234 : 0)).replace("1234 contributions", "1,234 contributions"))!;
    expect(r.days[0]!.count).toBe(1234);
  });
  it("returns null instead of guessing when the markup is not a contribution calendar", () => {
    expect(parseContributionsHtml("<html><body>Not Found</body></html>")).toBeNull();
    expect(parseContributionsHtml(fixture("2026-01-01", 40, () => 1))).toBeNull(); // too few days
  });
});

describe("parseGraphQl", () => {
  const week = (n: number) => ({
    contributionDays: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.UTC(2025, 10, 9 + n * 7 + i)).toISOString().slice(0, 10),
      contributionCount: i === 0 ? 4 : 0,
      contributionLevel: i === 0 ? "SECOND_QUARTILE" : "NONE",
    })),
  });
  it("maps the official response", () => {
    const r = parseGraphQl({ data: { user: { contributionsCollection: { contributionCalendar: { totalContributions: 212, weeks: Array.from({ length: 53 }, (_, n) => week(n)) } } } } })!;
    expect(r.total).toBe(212);
    expect(r.days).toHaveLength(371);
    expect(r.days[0]).toMatchObject({ count: 4, level: 2 });
    expect(r.source).toBe("graphql");
  });
  it("returns null for a missing user", () => expect(parseGraphQl({ data: { user: null } })).toBeNull());
});

describe("graph layout helpers", () => {
  const r = parseContributionsHtml(fixture("2025-11-09", 365, () => 0))!;
  it("starts week columns on Sunday and pads the first column when needed", () => {
    expect(toWeeks(r.days)[0]![0]!.date).toBe("2025-11-09"); // already a Sunday: no padding
    const midweek = r.days.slice(3); // starts Wednesday
    const weeks = toWeeks(midweek);
    expect(weeks[0]!.slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0]![3]!.date).toBe("2025-11-12");
  });
  it("labels months in order without repeats back to back and never crowds them", () => {
    const labels = monthLabels(toWeeks(r.days));
    expect(labels[0]!.label).toBe("Nov");
    for (let i = 1; i < labels.length; i++) {
      expect(labels[i]!.label).not.toBe(labels[i - 1]!.label);
      expect(labels[i]!.week - labels[i - 1]!.week).toBeGreaterThanOrEqual(3);
    }
    expect(labels.length).toBeGreaterThanOrEqual(12); // a year spans 12-13 months (Nov appears at both ends)
  });
});
