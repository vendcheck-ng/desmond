import { formatDay, monthLabels, toWeeks, type Contributions } from "@/lib/github";
import "@/app/github-graph.css";

/** Server component: the heatmap is plain HTML/CSS, so no third-party image and no client JS. */
export function ContributionGraph({ data, username }: { data: Contributions; username: string }) {
  const weeks = toWeeks(data.days);
  const labels = monthLabels(weeks);
  const first = data.days[0]!.date;
  const last = data.days[data.days.length - 1]!.date;
  const summary = `${data.total.toLocaleString("en-US")} contributions by ${username} between ${formatDay(first)} and ${formatDay(last)}`;
  return (
    <div className="gh-panel">
      <div className="gh-top">
        <p className="gh-total">
          <strong className="display">{data.total.toLocaleString("en-US")}</strong>{" "}
          <span>contribution{data.total === 1 ? "" : "s"} in the last year</span>
        </p>
        <p className="mono gh-user">@{username}</p>
      </div>
      <div className="gh-scroll">
        <div className="gh-graph" role="img" aria-label={summary} style={{ ["--weeks" as string]: weeks.length }}>
          <div className="gh-months" aria-hidden="true">
            {labels.map((l) => (
              <span key={l.week} className="mono" style={{ gridColumn: l.week + 1 }}>
                {l.label}
              </span>
            ))}
          </div>
          <div className="gh-days mono" aria-hidden="true">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          <div className="gh-grid" aria-hidden="true">
            {weeks.flatMap((w, wi) =>
              Array.from({ length: 7 }, (_, di) => {
                const d = w[di];
                return d ? (
                  <i
                    key={`${wi}-${di}`}
                    className="gh-cell"
                    data-level={d.level}
                    title={`${d.count === 0 ? "No contributions" : `${d.count} contribution${d.count === 1 ? "" : "s"}`} on ${formatDay(d.date)}`}
                  />
                ) : (
                  <i key={`${wi}-${di}`} className="gh-cell" data-empty />
                );
              }),
            )}
          </div>
        </div>
      </div>
      <div className="gh-legend mono" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <i key={l} className="gh-cell" data-level={l} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
