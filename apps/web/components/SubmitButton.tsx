"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pending = "Working…", className }: { children: React.ReactNode; pending?: string; className?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={busy} aria-disabled={busy}>
      {busy ? pending : children}
    </button>
  );
}
