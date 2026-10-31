"use client";
import Link from "next/link";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ padding: "6rem var(--gutter)" }}>
      <p className="mono">Something went wrong</p>
      <h1 className="display" style={{ fontSize: "var(--step-3)", margin: 0 }}>This page could not load.</h1>
      <p><button className="btn btn-primary" type="button" onClick={reset}>Try again</button> <Link className="btn" href="/">Home</Link></p>
    </main>
  );
}
