"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadAsset } from "@/app/admin/actions";
import { validateUpload } from "@/lib/uploads";

type Item = { id: string; file: File; state: "queued" | "uploading" | "done" | "error"; error?: string };

/** Drag-and-drop plus a native, keyboard-operable file picker. Files upload one at a time, each with its own status. */
export function UploadDropzone({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const patch = (id: string, p: Partial<Item>) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...p } : i)));

  async function run(it: Item) {
    patch(it.id, { state: "uploading", error: undefined });
    const fd = new FormData();
    fd.set("file", it.file);
    try {
      const r = await uploadAsset(projectId, fd);
      patch(it.id, r.ok ? { state: "done" } : { state: "error", error: r.error });
    } catch {
      patch(it.id, { state: "error", error: "Network or server error." });
    }
  }
  async function add(files: File[]) {
    const list: Item[] = files.map((file) => {
      const v = validateUpload(file);
      return { id: crypto.randomUUID(), file, state: v.ok ? "queued" : "error", error: v.ok ? undefined : v.error };
    });
    setItems((cur) => [...cur, ...list]);
    for (const it of list) if (it.state === "queued") await run(it);   // sequential keeps gallery order
    router.refresh();
  }

  return (
    <div
      className="dropzone"
      data-over={over}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); void add([...e.dataTransfer.files]); }}
    >
      <label htmlFor="asset-file">
        Add images
        <span className="hint">Drag files onto this box, or choose them. JPG, PNG or WebP, up to 10 MB each.</span>
      </label>
      <input id="asset-file" ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp"
        onChange={(e) => { void add([...(e.target.files ?? [])]); e.target.value = ""; }} />
      <ul className="uploads" aria-live="polite">
        {items.map((it) => (
          <li key={it.id}>
            <span>{it.file.name}</span>{" "}
            {it.state === "queued" && <span className="mono">Waiting</span>}
            {it.state === "uploading" && <><span className="mono">Uploading…</span> <progress aria-label={`Uploading ${it.file.name}`} /></>}
            {it.state === "done" && <span className="mono">Uploaded</span>}
            {it.state === "error" && (
              <>
                <span className="mono err">Failed: {it.error}</span>{" "}
                {validateUpload(it.file).ok && (
                  <button type="button" onClick={async () => { await run(it); router.refresh(); }}>Retry</button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
