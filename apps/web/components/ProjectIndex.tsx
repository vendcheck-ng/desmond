"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { STATUS_LABEL } from "@/lib/labels";
import type { ProjectWithCover } from "@/lib/types";

function Row({ project, period }: { project: ProjectWithCover; period: string | null }) {
  return (
    <motion.li
      data-motion
      className="product-row"
      data-status={project.status}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <div className="product-heading">
        <p className="mono product-status">
          <span className="status" data-status={project.status}>
            <i aria-hidden="true" />
            {STATUS_LABEL[project.status]}
          </span>
          {period && <span>{period}</span>}
        </p>
        <h3 className="display product-title">
          {project.external_url ? (
            <a href={project.external_url} target="_blank" rel="noopener noreferrer">
              {project.title}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <Link href={`/work/${project.slug}`}>{project.title}</Link>
          )}
        </h3>
      </div>
      <div className="product-copy">
        <p className="product-summary">{project.summary}</p>
        <div className="product-meta">
          {project.role && (
            <p>
              <span className="mono">Role</span> {project.role}
            </p>
          )}
          {project.tags.length > 0 && (
            <ul className="tags" aria-label="Technologies">
              {project.tags.slice(0, 5).map((tag) => (
                <li key={tag} className="mono">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <a
        className="product-open"
        href={project.external_url ?? `/work/${project.slug}`}
        target={project.external_url ? "_blank" : undefined}
        rel={project.external_url ? "noopener noreferrer" : undefined}
        aria-label={`${project.external_url ? "Visit" : "View"} ${project.title}${project.external_url ? " (opens in a new tab)" : ""}`}
      >
        <span aria-hidden="true">↗</span>
      </a>
    </motion.li>
  );
}

export function ProjectIndex({
  projects,
  periods,
}: {
  projects: ProjectWithCover[];
  periods: Record<string, string | null>;
}) {
  return (
    <section id="work" aria-labelledby="work-h" className="index">
      <div className="section-head">
        <div className="shell section-head-inner">
          <h2 id="work-h" className="mono">
            <span className="sec-no">§ 02</span> Products
          </h2>
          <p className="mono products-note">Own products</p>
        </div>
      </div>
      <div className="shell">
        {projects.length === 0 ? (
          <p className="empty">No published products yet.</p>
        ) : (
          <ol className="index-list">
            {projects.map((project) => (
              <Row key={project.id} project={project} period={periods[project.id] ?? null} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
