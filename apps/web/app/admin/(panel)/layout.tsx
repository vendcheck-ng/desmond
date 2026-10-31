import "../admin.css";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase-server";
import { signOut } from "../actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="adm-bar">
        <nav aria-label="Admin"><a href="/admin"><strong>Atlas admin</strong></a><a href="/admin/profile">Site profile</a><a href="/" target="_blank" rel="noopener noreferrer">View site<span className="sr-only"> (opens in a new tab)</span></a></nav>
        <form action={signOut} className="row"><span className="mono">{user.email}</span><button type="submit">Sign out</button></form>
      </header>
      <main id="main" className="adm">{children}</main>
    </>
  );
}
