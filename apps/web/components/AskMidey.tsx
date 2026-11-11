"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ASK, splitLinks, type ChatMessage } from "@/lib/ask-core";
import "@/app/ask.css";

type Msg = ChatMessage & { id: number; failed?: boolean };

const SUGGESTIONS = [
  "What has Desmond built?",
  "What is VendCheck?",
  "Is he open to new work?",
  "How can I contact him?",
];

const FRIENDLY: Record<number, string> = {
  429: "That's a lot of questions in a short time. Please try again in a few minutes, or email Desmond directly.",
  503: "AskMidey is unavailable right now. You can email Desmond directly.",
};

function Rich({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((part, i) =>
        part.href ? (
          <a key={i} href={part.href} target={part.href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer">
            {part.text}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function AskMidey({ email }: { email?: string | null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const idRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const close = useCallback(() => {
    setOpen(false);
    pillRef.current?.focus();
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, ASK.maxUserChars);
      if (!text || busy) return;
      const user: Msg = { id: ++idRef.current, role: "user", content: text };
      const replyId = ++idRef.current;
      const history = [...messages.filter((m) => !m.failed), user].slice(-10).map(({ role, content }) => ({ role, content }));
      // The API requires the history to begin with a user turn.
      while (history.length && history[0]!.role !== "user") history.shift();

      setMessages((m) => [...m, user, { id: replyId, role: "assistant", content: "" }]);
      setInput("");
      setBusy(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const fail = (message: string) => setMessages((m) => m.map((x) => (x.id === replyId ? { ...x, content: message, failed: true } : x)));
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          fail(FRIENDLY[res.status] ?? "Something went wrong. Please try again, or email Desmond directly.");
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          const errored = acc.includes(ASK.errorSentinel);
          const shown = acc.replace(ASK.errorSentinel, "");
          setMessages((m) => m.map((x) => (x.id === replyId ? { ...x, content: shown } : x)));
          if (errored) {
            if (!shown.trim()) fail("Something went wrong. Please try again, or email Desmond directly.");
            return;
          }
        }
        if (!acc.trim()) fail("I couldn't produce an answer. Please try again.");
      } catch (err) {
        if ((err as Error).name !== "AbortError") fail("The connection dropped. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [busy, messages],
  );

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setBusy(false);
    inputRef.current?.focus();
  };

  return (
    <>
      <button
        ref={pillRef}
        type="button"
        className="ask-pill"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1.5c.9 5.6 4.9 9.6 10.5 10.5-5.6.9-9.6 4.9-10.5 10.5-.9-5.6-4.9-9.6-10.5-10.5C7.1 11.1 11.1 7.1 12 1.5Z" />
        </svg>
        Ask Midey
      </button>

      {open && (
        <section
          className="ask-panel"
          role="dialog"
          aria-labelledby={titleId}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        >
          <header className="ask-head">
            <div>
              <h2 id={titleId} className="display">
                AskMidey
              </h2>
              <p className="mono">AI assistant for this site</p>
            </div>
            <div className="ask-head-actions">
              {messages.length > 0 && (
                <button type="button" className="mono ask-quiet" onClick={reset}>
                  New chat
                </button>
              )}
              <button type="button" className="ask-close" onClick={close} aria-label="Close AskMidey">
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </header>

          <div className="ask-log" ref={logRef} role="log" aria-live="polite" aria-busy={busy}>
            {messages.length === 0 ? (
              <div className="ask-intro">
                <p>Ask about Desmond’s work, background or availability. I only know what is on this site, and I can be wrong.</p>
                <ul>
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button type="button" className="mono ask-chip" onClick={() => send(s)}>
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="ask-msg" data-role={m.role} data-failed={m.failed || undefined}>
                  {m.content ? (
                    m.content.split(/\n{2,}/).map((para, i) => (
                      <p key={i}>
                        <Rich text={para} />
                      </p>
                    ))
                  ) : (
                    <p className="ask-typing" aria-label="AskMidey is typing">
                      <span />
                      <span />
                      <span />
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <form
            className="ask-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <label className="sr-only" htmlFor={`${titleId}-q`}>
              Your question
            </label>
            <input
              id={`${titleId}-q`}
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={ASK.maxUserChars}
              placeholder="Ask a question…"
              autoComplete="off"
              enterKeyHint="send"
            />
            <button type="submit" className="mono" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
          <p className="ask-foot mono">
            AI answers can be wrong. Messages are processed by an AI provider, so don’t share anything sensitive.
            {email && (
              <>
                {" "}
                Prefer a person? <a href={`mailto:${email}`}>Email Desmond</a>.
              </>
            )}
          </p>
        </section>
      )}
    </>
  );
}
