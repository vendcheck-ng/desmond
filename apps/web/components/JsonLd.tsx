import { serializeJsonLd } from "@/lib/seo";

/** Server component: structured data must be in the initial HTML so crawlers and AI agents see it without running JS. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
