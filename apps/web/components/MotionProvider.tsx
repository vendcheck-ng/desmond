"use client";
import { MotionConfig } from "framer-motion";

/** reducedMotion="user": transform animations are skipped when the visitor asks for reduced motion. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
