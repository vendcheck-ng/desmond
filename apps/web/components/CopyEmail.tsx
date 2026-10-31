"use client";
import { useState } from "react";

export function CopyEmail({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try { await navigator.clipboard.writeText(email); setState("copied"); } catch { setState("failed"); }
    setTimeout(() => setState("idle"), 2600);
  }
  return (
    <>
      <button type="button" className="btn" onClick={copy}>Copy email</button>
      <span className="sr-only" role="status" aria-live="polite">{state === "copied" ? "Email address copied" : state === "failed" ? `Could not copy. The address is ${email}` : ""}</span>
      {state !== "idle" && <span className="mono copy-note" aria-hidden="true">{state === "copied" ? "Copied ✓" : `Copy failed — ${email}`}</span>}
    </>
  );
}
