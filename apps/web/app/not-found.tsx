import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not found", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <main style={{ padding: "6rem var(--gutter)" }}>
      <p className="mono">404</p>
      <h1 className="display" style={{ fontSize: "var(--step-5)", margin: 0 }}>Not in the atlas.</h1>
      <p><Link className="btn btn-primary" href="/">Back to the index</Link></p>
    </main>
  );
}
