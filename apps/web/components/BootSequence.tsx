"use client";

import { useEffect, useState } from "react";

const LOG_DELAYS = [0, 210, 880, 1340, 2100, 2800];

const timestamp = (startedAt: number, index: number) => {
  const date = new Date(startedAt + LOG_DELAYS[index]!);
  const clock = date.toLocaleTimeString("en-GB", { hour12: false });
  return `${clock}.${String(date.getMilliseconds()).padStart(3, "0")}`;
};

function githubHandle(value: string | null) {
  try {
    const url = new URL(value ?? "");
    if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null;
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  } catch {
    return null;
  }
}

export function BootSequence({
  name,
  productCount,
  capabilityCount,
  github,
}: {
  name: string;
  productCount: number;
  capabilityCount: number;
  github: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(-1);
  const [leaving, setLeaving] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const handle = githubHandle(github);
  const logs = [
    "Booting portfolio...",
    `Reading site profile: ${name}`,
    `Loaded ${productCount} published product${productCount === 1 ? "" : "s"}`,
    `Preparing ${capabilityCount} capability groups`,
    handle ? `GitHub profile linked: @${handle}` : "GitHub profile not connected",
    "Portfolio ready",
  ];

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("atlas-boot-seen") === "1";
    } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const start = Date.now();
    setStartedAt(start);
    setVisible(true);
    const timers = LOG_DELAYS.map((delay, index) => window.setTimeout(() => setStep(index), 140 + delay));
    let hide = 0;
    const finish = window.setTimeout(
      () => {
        try {
          sessionStorage.setItem("atlas-boot-seen", "1");
        } catch {}
        setLeaving(true);
        hide = window.setTimeout(() => setVisible(false), 320);
      },
      140 + LOG_DELAYS.at(-1)! + 650
    );

    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(finish);
      window.clearTimeout(hide);
    };
  }, []);

  if (!visible || startedAt === null) return null;

  return (
    <div className={`boot-screen${leaving ? " is-leaving" : ""}`} aria-hidden="true">
      <div className="boot-frame">
        <div className="boot-top mono">
          <span>desmond / portfolio</span>
          <span>main · Next.js 15</span>
        </div>
        <p className="boot-title">{name}</p>
        <div className="boot-log mono">
          {logs.map((line, index) => (
            <p key={line} className={index <= step ? "is-visible" : undefined}>
              <span>{timestamp(startedAt, index)}</span>
              <span>{line}</span>
            </p>
          ))}
        </div>
        <div className="boot-progress" aria-hidden="true">
          <span style={{ width: `${Math.max(0, ((step + 1) / logs.length) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
