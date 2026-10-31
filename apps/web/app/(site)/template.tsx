"use client";
import { motion } from "framer-motion";

// Opacity only, on purpose: a transform here would break position:fixed/sticky children.
export default function Template({ children }: { children: React.ReactNode }) {
  return <motion.div data-motion initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>{children}</motion.div>;
}
