import "../site.css";
import { getProfile, getPublishedProjects } from "@/lib/data";
import { BootSequence } from "@/components/BootSequence";
import { MotionProvider } from "@/components/MotionProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { DEFAULT_CAPABILITIES } from "@/lib/capabilities";

export const revalidate = 60;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [p, projects] = await Promise.all([getProfile(), getPublishedProjects()]);
  const s = p?.socials ?? {};
  const capabilities = p?.capabilities?.length ? p.capabilities : DEFAULT_CAPABILITIES;
  const social = [
    ["LinkedIn", s.linkedin],
    ["X", s.x],
    ["GitHub", s.github],
  ].filter(([, u]) => u) as [string, string][];
  return (
    <div className="public-site">
      <BootSequence
        name={p?.display_name ?? "Desmond Odeyemi"}
        productCount={projects.length}
        capabilityCount={capabilities.length}
        github={s.github ?? null}
      />
      <MotionProvider>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader
          name={p?.display_name ?? "Desmond Odeyemi"}
          links={[
            { href: "/#work", label: "Work" },
            { href: "/stack", label: "Stack" },
            { href: "/about", label: "About" },
            { href: "/#contact", label: "Contact" },
          ]}
        />
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="shell footer-inner">
            {p?.email && (
              <a className="footer-mail display" href={`mailto:${p.email}`}>
                {p.email}
              </a>
            )}
            {p?.alternate_email && (
              <a className="footer-alt-email mono" href={`mailto:${p.alternate_email}`}>
                {p.alternate_email}
              </a>
            )}
            <ul>
              {social.map(([label, url]) => (
                <li key={label}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mono">
              {p?.footer_copy || `© ${new Date().getFullYear()} ${p?.display_name ?? "Desmond Odeyemi"}`}
            </p>
          </div>
        </footer>
      </MotionProvider>
    </div>
  );
}
