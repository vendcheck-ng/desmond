"use client";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

export function ReadingProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return <motion.div aria-hidden="true" className="progress" style={{ scaleX: reduce ? scrollYProgress : smooth }} />;
}
