"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type NavLink = { href: string; label: string };

const isCurrentRoute = (link: NavLink, pathname: string) => !link.href.includes("#") && link.href === pathname;

export function SiteHeader({ name, links }: { name: string; links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const button = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="wordmark">
          <span className="mark" aria-hidden="true" />
          {name}
        </Link>
        <nav className="nav-desktop" aria-label="Primary">
          {links.map((l) => {
            const current = isCurrentRoute(l, pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={l.label === "Contact" ? "nav-cta" : undefined}
                aria-current={current ? "page" : undefined}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          ref={button}
          type="button"
          className="menu-btn"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span className="burger" data-open={open} aria-hidden="true" />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            className="nav-mobile"
            aria-label="Primary"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {links.map((l, i) => {
              const current = isCurrentRoute(l, pathname);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={l.label === "Contact" ? "nav-cta" : undefined}
                  aria-current={current ? "page" : undefined}
                  ref={i === 0 ? firstLink : undefined}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
