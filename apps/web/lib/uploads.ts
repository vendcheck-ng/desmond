export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

type Check = { ok: true; ext: string } | { ok: false; error: string };

/** Runs in the browser (fast feedback) and again on the server (the check that counts). */
export function validateUpload(file: { name: string; size: number; type: string }, allowPdf = false): Check {
  const name = file.name || "File";
  if (!file.size) return { ok: false, error: `${name} is empty.` };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: `${name} is larger than 10 MB.` };
  const ext = EXT[file.type] ?? (allowPdf && file.type === "application/pdf" ? "pdf" : null);
  if (!ext) return { ok: false, error: `${name}: only JPG, PNG or WebP images${allowPdf ? " (or a PDF)" : ""} are allowed.` };
  return { ok: true, ext };
}

/** Identify a file by its first bytes so a renamed or mislabelled file is rejected. */
export function sniffType(b: Uint8Array): string | null {
  const is = (...v: number[]) => v.every((x, i) => b[i] === x);
  if (is(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (is(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (is(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (is(0x25, 0x50, 0x44, 0x46)) return "application/pdf";
  return null;
}
