"use client";
import { motion } from "framer-motion";

const ease = [0.2, 0.7, 0.2, 1] as const;
type Props = { children: React.ReactNode; delay?: number; y?: number; className?: string };

/** Fades and lifts into view once. `data-motion` lets the no-JS fallback force it visible. */
export function Reveal({ children, delay = 0, y = 24, className }: Props) {
  return (
    <motion.div data-motion className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }} transition={{ duration: 0.7, delay, ease }}>
      {children}
    </motion.div>
  );
}
