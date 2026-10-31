import type { Metadata } from "next";
import Link from "next/link";
import { getProfile } from "@/lib/data";
import { DEFAULT_CAPABILITIES } from "@/lib/capabilities";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;
export const metadata: Metadata = pageMetadata({
  title: "Stack",
  description:
    "The tools and skills behind Desmond Odeyemi's product work: UX/UI design, React and TypeScript engineering, Flutter, user research and data analysis.",
  path: "/stack",
});

export default async function StackPage() {
  const profile = await getProfile();
  const capabilities = profile?.capabilities?.length ? profile.capabilities : DEFAULT_CAPABILITIES;
  const name = profile?.display_name ?? "Desmond Odeyemi";

  return (
    <section className="stack-page shell" aria-labelledby="stack-title">
      <header className="stack-intro">
        <p className="mono">{name} / Stack</p>
        <h1 id="stack-title" className="display">
          The tools behind the work.
        </h1>
        <p>{profile?.intro || "A practical toolkit for understanding, designing, and building digital products."}</p>
      </header>
      <ol className="stack-list">
        {capabilities.map((capability, index) => (
          <li className="stack-row" key={capability.group}>
            <span className="stack-number mono">{String(index + 1).padStart(2, "0")}</span>
            <div className="stack-detail">
              <h2>{capability.group}</h2>
              <ul className="stack-tags" aria-label={`${capability.group} capabilities`}>
                {capability.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
      <footer className="stack-footer">
        <Link className="btn btn-primary" href="/#work">
          Explore products
        </Link>
        <Link className="stack-back" href="/about">
          More about me <span aria-hidden="true">↗</span>
        </Link>
      </footer>
    </section>
  );
}
