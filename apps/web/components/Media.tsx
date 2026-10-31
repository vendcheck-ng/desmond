import Image from "next/image";
import { mediaUrl } from "@/lib/media-url";

type Props = { path: string | null | undefined; alt: string; ratio?: string; priority?: boolean; sizes?: string; src?: string | null; unoptimized?: boolean };

/** Reserves its aspect ratio so layout stays stable while images load. */
export function Media({ path, alt, ratio = "4 / 3", priority = false, sizes = "(min-width: 60rem) 50vw, 100vw", src: srcOverride, unoptimized = false }: Props) {
  const src = srcOverride ?? mediaUrl(path);
  return (
    <div className="media" style={{ aspectRatio: ratio }}>
      {src ? <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={unoptimized} style={{ objectFit: "cover" }} /> : null}
    </div>
  );
}
