#!/usr/bin/env node
/**
 * Turns your original design exports into web-ready assets.
 *
 *   npm run import-designs                      # searches ~/Downloads, ~/Desktop, ~/Pictures
 *   npm run import-designs -- ~/path/to/folder  # or point it at the folder
 *
 * For every design it writes, under apps/web/public/designs/<slug>/:
 *   01.webp, 02.webp ...  full screens, never upscaled, max 1800px wide
 *   cover.webp            4:3 crop used on cards
 *   og.jpg                1200x630 crop used for link previews (JPEG: widest platform support)
 * and records the exact pixel sizes in apps/web/lib/designs.manifest.json so pages reserve the
 * right space before an image loads (no layout shift).
 *
 * The plan below must stay in step with apps/web/lib/designs.ts (same slugs and file ids).
 * Originals are only read, never modified or copied into the repo.
 */
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "apps/web/public/designs");
const MANIFEST = join(ROOT, "apps/web/lib/designs.manifest.json");

/** IMG number -> output id. `cover` / `og` name the source and where to anchor the crop. */
const PLAN = {
  techsis: {
    images: { "01": "2053", "02": "2048", "03": "2047", "04": "2049" },
    cover: { from: "01", focus: "centre" },
    og: { from: "01", focus: "centre" },
  },
  zenova: {
    images: { "01": "2051", "02": "2052", "03": "2046" },
    cover: { from: "01", focus: "top" },
    og: { from: "01", focus: "top" },
  },
  cityboy: {
    images: { "01": "2055", "02": "2057", "03": "2056" },
    cover: { from: "01", focus: "top" },
    og: { from: "01", focus: "top" },
  },
  wallet: {
    images: { "01": "2054" },
    cover: { from: "01", focus: "centre" },
    og: { from: "01", focus: "top" },
  },
  jobspot: {
    images: { "01": "2043", "02": "2044" },
    cover: { from: "01", focus: "top" },
    og: { from: "01", focus: "top" },
  },
};

const NAME = /^IMG[ _-]?(\d{4})(?:[ _-]\d+)?\.(?:jpe?g|png|webp)$/i;
const SKIP = new Set(["node_modules", ".git", ".next", ".Trash"]);

function* walk(dir, depth = 0) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // unreadable or missing: skip quietly
  }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.isDirectory()) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (depth < 3 && !SKIP.has(e.name) && !e.name.endsWith(".photoslibrary")) yield* walk(full, depth + 1);
    } else if (e.isFile()) yield full;
  }
}

function findOriginals(roots, wanted) {
  const found = new Map(); // number -> { path, mtime }
  for (const root of roots) {
    for (const file of walk(root)) {
      const m = NAME.exec(file.split("/").pop());
      if (!m || !wanted.has(m[1])) continue;
      const mtime = statSync(file).mtimeMs;
      const prev = found.get(m[1]);
      if (!prev || mtime > prev.mtime) found.set(m[1], { path: file, mtime });
    }
  }
  return found;
}

/** Largest rectangle of the given aspect ratio, anchored to the top or centre of the source. */
function cropBox(w, h, ratio, focus) {
  let cw = w;
  let ch = Math.round(w / ratio);
  if (ch > h) {
    ch = h;
    cw = Math.round(h * ratio);
  }
  const left = Math.floor((w - cw) / 2);
  const top = focus === "top" ? 0 : Math.floor((h - ch) / 2);
  return { left, top, width: cw, height: ch };
}

const kb = (n) => `${Math.round(n / 1024)} KB`;

async function main() {
  const args = process.argv.slice(2).map((p) => resolve(p.replace(/^~(?=$|\/)/, homedir())));
  const roots = args.length
    ? args
    : [join(homedir(), "Downloads"), join(homedir(), "Desktop"), join(homedir(), "Pictures"), process.cwd()];

  const wanted = new Set(Object.values(PLAN).flatMap((p) => Object.values(p.images)));
  const found = findOriginals(roots, wanted);
  const missing = [...wanted].filter((n) => !found.has(n)).sort();
  if (missing.length) {
    console.error(`\nCould not find: ${missing.map((n) => `IMG_${n}`).join(", ")}`);
    console.error(`Searched: ${roots.join(", ")}`);
    console.error("Point the script at the folder that holds them:\n  npm run import-designs -- ~/path/to/folder\n");
    process.exit(1);
  }

  const manifest = {};
  let total = 0;
  for (const [slug, plan] of Object.entries(PLAN)) {
    const dir = join(OUT, slug);
    mkdirSync(dir, { recursive: true });
    manifest[slug] = { cover: null, og: { width: 1200, height: 630 }, images: {} };

    for (const [id, num] of Object.entries(plan.images)) {
      const src = found.get(num).path;
      const info = await sharp(src)
        .rotate()
        .resize({ width: 1800, withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 })
        .toFile(join(dir, `${id}.webp`));
      manifest[slug].images[id] = { width: info.width, height: info.height };
      total += info.size;
      console.log(`  ${slug}/${id}.webp  ${info.width}x${info.height}  ${kb(info.size)}   <- IMG_${num}`);
    }

    // Cover (4:3) and link-preview (1200x630) crops come from the original, not the resized copy.
    const source = found.get(plan.images[plan.cover.from]).path;
    const meta = await sharp(source).rotate().metadata();
    const rotated = meta.orientation && meta.orientation >= 5 ? { w: meta.height, h: meta.width } : { w: meta.width, h: meta.height };

    const c = cropBox(rotated.w, rotated.h, 4 / 3, plan.cover.focus);
    const coverInfo = await sharp(source)
      .rotate()
      .extract(c)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toFile(join(dir, "cover.webp"));
    manifest[slug].cover = { width: coverInfo.width, height: coverInfo.height };

    const o = cropBox(rotated.w, rotated.h, 1200 / 630, plan.og.focus);
    const ogInfo = await sharp(source)
      .rotate()
      .extract(o)
      .resize(1200, 630)
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(join(dir, "og.jpg"));
    total += coverInfo.size + ogInfo.size;
    console.log(`  ${slug}/cover.webp ${coverInfo.width}x${coverInfo.height}   ${slug}/og.jpg 1200x630`);
  }

  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nDone. ${kb(total)} written to apps/web/public/designs and sizes saved to lib/designs.manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
