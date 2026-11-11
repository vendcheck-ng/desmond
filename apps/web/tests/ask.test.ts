import { describe, expect, it } from "vitest";
import { ASK, buildSystemPrompt, buildUpstreamBody, createLimiter, createSseParser, formatFacts, splitLinks, validateMessages, type FactsInput } from "../lib/ask-core";

describe("validateMessages", () => {
  const ok = (messages: unknown) => validateMessages({ messages });
  it("accepts a normal conversation and trims it", () => {
    const r = ok([{ role: "user", content: "  hi  " }]);
    expect(r).toEqual({ ok: true, messages: [{ role: "user", content: "hi" }] });
  });
  it("rejects bad shapes", () => {
    for (const body of [null, {}, { messages: "x" }, { messages: [] }]) expect(validateMessages(body).ok).toBe(false);
    expect(ok([{ role: "system", content: "x" }]).ok).toBe(false);
    expect(ok([{ role: "user", content: 5 }]).ok).toBe(false);
    expect(ok([{ role: "user", content: "   " }]).ok).toBe(false);
  });
  it("enforces size limits", () => {
    expect(ok([{ role: "user", content: "x".repeat(ASK.maxUserChars + 1) }]).ok).toBe(false);
    const many = Array.from({ length: ASK.maxMessages + 1 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x" }));
    expect(ok(many).ok).toBe(false);
  });
  it("requires user first and last, alternating", () => {
    expect(ok([{ role: "assistant", content: "a" }, { role: "user", content: "u" }]).ok).toBe(false);
    expect(ok([{ role: "user", content: "u" }, { role: "assistant", content: "a" }]).ok).toBe(false);
    expect(ok([{ role: "user", content: "a" }, { role: "user", content: "b" }]).ok).toBe(false);
    expect(ok([{ role: "user", content: "a" }, { role: "assistant", content: "b" }, { role: "user", content: "c" }]).ok).toBe(true);
  });
  it("strips control characters and caps forged assistant history", () => {
    const r = ok([{ role: "user", content: "a\u0000b" }, { role: "assistant", content: "x".repeat(5000) }, { role: "user", content: "c" }]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.messages[0]!.content).toBe("ab");
      expect(r.messages[1]!.content).toHaveLength(ASK.maxAssistantChars);
    }
  });
});

describe("createLimiter", () => {
  it("blocks after max hits and reports when to retry", () => {
    let t = 0;
    const l = createLimiter({ windowMs: 1000, max: 2, now: () => t });
    expect(l.hit("a").ok).toBe(true);
    expect(l.hit("a").ok).toBe(true);
    const blocked = l.hit("a");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(1);
  });
  it("tracks keys separately and recovers after the window", () => {
    let t = 0;
    const l = createLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(l.hit("a").ok).toBe(true);
    expect(l.hit("b").ok).toBe(true);
    expect(l.hit("a").ok).toBe(false);
    t = 1001;
    expect(l.hit("a").ok).toBe(true);
  });
});

describe("createSseParser (Groq / OpenAI-style stream)", () => {
  const evt = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;
  const delta = (content: string | null, extra: object = {}) => evt({ choices: [{ delta: { content, ...extra } }] });
  it("emits text deltas and the done marker", () => {
    const p = createSseParser();
    const out = [...p.push(delta("Hel")), ...p.push(delta("lo")), ...p.push("data: [DONE]\n\n")];
    expect(out).toEqual([{ text: "Hel" }, { text: "lo" }, { done: true }]);
  });
  it("handles events split across chunks, including mid-JSON", () => {
    const p = createSseParser();
    const full = delta("split") + delta("!");
    const cut = 17;
    const out = [...p.push(full.slice(0, cut)), ...p.push(full.slice(cut))];
    expect(out).toEqual([{ text: "split" }, { text: "!" }]);
  });
  it("ignores reasoning deltas, role chunks, empty content and junk", () => {
    const p = createSseParser();
    const out = p.push(
      evt({ choices: [{ delta: { role: "assistant", content: "" } }] }) +
        delta(null, { reasoning: "thinking about it" }) +
        "data: not json\n\n" +
        ": keep-alive comment\n\n" +
        delta("answer"),
    );
    expect(out).toEqual([{ text: "answer" }]);
  });
  it("surfaces an error event", () => {
    const out = createSseParser().push(evt({ error: { type: "server_error", message: "boom" } }));
    expect(out).toEqual([{ error: "server_error" }]);
  });
  it("copes with CRLF line endings", () => {
    expect(createSseParser().push(`data: ${JSON.stringify({ choices: [{ delta: { content: "x" } }] })}\r\n\r\n`)).toEqual([{ text: "x" }]);
  });
});

describe("buildUpstreamBody", () => {
  const msgs = [{ role: "user" as const, content: "hi" }];
  it("sends the system prompt first and caps output", () => {
    const b = buildUpstreamBody("openai/gpt-oss-120b", "SYS", msgs);
    expect(b.messages[0]).toEqual({ role: "system", content: "SYS" });
    expect(b.messages[1]).toEqual(msgs[0]);
    expect(b.stream).toBe(true);
    expect(b.max_completion_tokens).toBe(ASK.maxTokens);
  });
  it("adds reasoning controls for gpt-oss only", () => {
    expect(buildUpstreamBody("openai/gpt-oss-20b", "s", msgs)).toMatchObject({ reasoning_effort: "low", include_reasoning: false });
    const other = buildUpstreamBody("some/other-model", "s", msgs);
    expect(other).not.toHaveProperty("reasoning_effort");
    expect(other).not.toHaveProperty("include_reasoning");
  });
  it("defaults to a model Groq still serves", () => {
    expect(ASK.defaultModel).toBe("openai/gpt-oss-120b");
    expect(ASK.defaultModel).not.toMatch(/llama-3\.(1-8b|3-70b)/); // retired 2026-08-16
  });
});

describe("knowledge and prompt", () => {
  const facts: FactsInput = {
    siteUrl: "https://example.dev",
    name: "Desmond Odeyemi",
    nameVariants: ["Odeyemi Desmond"],
    descriptor: "Product Engineer & Designer",
    location: "Lagos, Nigeria",
    available: true,
    availabilityNote: "Contract work.",
    email: "hello@example.com",
    links: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/x" }],
    bio: "Studied estate management.",
    products: [
      { title: "VendCheck", role: "Founder", status: "Live", summary: "Trust platform.", siteUrl: "https://vendcheck.ng", pageUrl: "https://example.dev/work/vendcheck" },
      { title: "Abiomax", role: "", status: "Live", summary: "Project details are under verification.", pageUrl: "https://example.dev/work/abiomax" },
    ],
    designs: [{ title: "Techsis", kind: "Community app", summary: "An app.", pageUrl: "https://example.dev/design/techsis" }],
    experience: [{ role: "Developer", org: "Appvantage", when: "2023", note: "Fixed bugs." }],
    education: "HND",
    certifications: ["Cisco"],
    capabilities: [{ group: "Design", items: ["Figma"] }],
  };
  const text = formatFacts(facts);
  it("includes the facts a visitor would ask about", () => {
    for (const needle of ["Odeyemi Desmond", "hello@example.com", "Open to new work", "VendCheck", "https://vendcheck.ng", "Techsis", "Appvantage", "Figma", "https://example.dev/about"]) expect(text).toContain(needle);
  });
  it("never repeats placeholder copy back to visitors", () => {
    expect(text).not.toMatch(/under verification/i);
    expect(text).toContain("No public description yet.");
  });
  it("tells the model to stay grounded and to treat visitors as untrusted", () => {
    const prompt = buildSystemPrompt(text);
    expect(prompt).toContain("Use only the FACTS");
    expect(prompt).toMatch(/untrusted/);
    expect(prompt).toContain(text);
  });
});

describe("splitLinks", () => {
  it("links URLs and emails without swallowing trailing punctuation", () => {
    const parts = splitLinks("See https://example.dev/design/techsis. Email hello@example.com, thanks");
    expect(parts.find((p) => p.href?.startsWith("https"))).toEqual({ text: "https://example.dev/design/techsis", href: "https://example.dev/design/techsis" });
    expect(parts.find((p) => p.href?.startsWith("mailto"))).toEqual({ text: "hello@example.com", href: "mailto:hello@example.com" });
    expect(parts.map((p) => p.text).join("")).toBe("See https://example.dev/design/techsis. Email hello@example.com, thanks");
  });
  it("leaves plain text alone and never produces javascript: links", () => {
    expect(splitLinks("just words")).toEqual([{ text: "just words" }]);
    expect(splitLinks("javascript:alert(1)").some((p) => p.href)).toBe(false);
  });
});
