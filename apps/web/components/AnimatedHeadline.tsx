"use client";
import { Fragment } from "react";
import { motion } from "framer-motion";
import { parseEmphasis, stripEmphasis } from "@/lib/emphasis";

/** Word-by-word rise. Words wrapped in *asterisks* become italic red. Screen readers get the plain sentence. */
export function AnimatedHeadline({ text, id, className }: { text: string; id?: string; className?: string }) {
  const words = parseEmphasis(text).flatMap((seg) => seg.text.split(/\s+/).filter(Boolean).map((w) => ({ w, em: seg.em })));
  return (
    <h1 id={id} className={className} aria-label={stripEmphasis(text)}>
      {words.map((x, i) => (
        <Fragment key={i}>
          <span className="word-mask" aria-hidden="true">
            <motion.span data-motion className={x.em ? "em" : undefined} style={{ display: "inline-block" }}
              initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.85, delay: 0.1 + i * 0.06, ease: [0.2, 0.7, 0.2, 1] }}>
              {x.w}
            </motion.span>
          </span>{" "}
        </Fragment>
      ))}
    </h1>
  );
}
