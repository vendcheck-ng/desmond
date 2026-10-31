"use client";
import { useEffect, useRef } from "react";

/** Status/error message that takes focus on arrival so screen-reader users hear the result of a redirect. */
export function Flash({ kind, children }: { kind: "ok" | "error"; children: React.ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <p ref={ref} tabIndex={-1} className={`notice${kind === "error" ? " error" : ""}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}
