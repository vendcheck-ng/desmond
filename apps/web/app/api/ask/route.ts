import { ASK, buildSystemPrompt, buildUpstreamBody, createLimiter, createSseParser, validateMessages } from "@/lib/ask-core";
import { loadFacts } from "@/lib/ask-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Per-instance limits (see createLimiter). The real spend cap is the one you set in the Groq console.
const perIpBurst = createLimiter({ windowMs: 10 * 60 * 1000, max: 8 });
const perIpDay = createLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 30 });
const globalDay = createLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 600 });

const json = (status: number, error: string, headers: Record<string, string> = {}) =>
  Response.json({ error }, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return json(503, "not_configured");

  // Browsers always send Origin on a cross-site POST; refuse any that is not this site.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return json(403, "forbidden");
    } catch {
      return json(403, "forbidden");
    }
  }

  const text = await req.text();
  if (text.length > ASK.maxBodyBytes) return json(413, "too_large");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, "invalid_json");
  }
  const v = validateMessages(body);
  if (!v.ok) return json(400, v.error);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  for (const [limiter, key] of [
    [perIpBurst, ip],
    [perIpDay, ip],
    [globalDay, "all"],
  ] as const) {
    const r = limiter.hit(key);
    if (!r.ok) return json(429, "rate_limited", { "Retry-After": String(r.retryAfterSec) });
  }

  let system: string;
  try {
    system = buildSystemPrompt(await loadFacts());
  } catch (err) {
    console.error("[ask] could not load site facts:", err instanceof Error ? err.message : err);
    return json(503, "unavailable");
  }

  const base = (process.env.GROQ_BASE_URL?.trim() || ASK.defaultBaseUrl).replace(/\/+$/, "");
  const model = process.env.ASK_MIDEY_MODEL?.trim() || ASK.defaultModel;
  let upstream: Response;
  try {
    upstream = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(buildUpstreamBody(model, system, v.messages)),
      signal: req.signal,
    });
  } catch (err) {
    if (!req.signal.aborted) console.error("[ask] upstream unreachable:", err instanceof Error ? err.message : err);
    return json(503, "unavailable");
  }

  if (!upstream.ok || !upstream.body) {
    // Status only: never log message content or response bodies.
    console.error(`[ask] upstream returned ${upstream.status}${upstream.status === 401 ? " (check GROQ_API_KEY)" : upstream.status === 404 || upstream.status === 400 ? ` (check the model id: ${model})` : ""}`);
    return upstream.status === 429 ? json(503, "busy") : json(502, "upstream_error");
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const parser = createSseParser();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) return controller.close();
        for (const item of parser.push(decoder.decode(value, { stream: true }))) {
          if ("text" in item) controller.enqueue(encoder.encode(item.text));
          else if ("error" in item) {
            console.error(`[ask] stream error event: ${item.error}`);
            controller.enqueue(encoder.encode(ASK.errorSentinel));
            await reader.cancel();
            return controller.close();
          }
        }
      } catch {
        // Client went away or the connection dropped.
        try {
          controller.enqueue(encoder.encode(ASK.errorSentinel));
          controller.close();
        } catch {}
      }
    },
    cancel() {
      return reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
