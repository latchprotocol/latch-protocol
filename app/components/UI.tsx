"use client";

import { useState } from "react";

export function NeonButton({
  children,
  href,
  onClick,
  variant = "primary"
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-[13px] font-semibold transition";
  const styles =
    variant === "primary"
      ? "border border-white/12 bg-white/10 text-white hover:bg-white/15"
      : "border border-white/12 bg-white/5 text-white/85 hover:bg-white/8";
  const cls = `${base} ${styles}`;

  if (href) {
    return (
      <a className={cls} href={href}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

export function Panel({
  title,
  kicker,
  children
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      {kicker ? (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/30 px-3 py-1 text-[11px] text-white/70">
          <span className="h-2 w-2 rounded-full bg-white/80" />
          {kicker}
        </div>
      ) : null}
      <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-white/70">{children}</div>
    </section>
  );
}

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/12 bg-black/50">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="text-[12px] font-semibold text-white/75">Example</div>
        <button
          className="rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-white/80 hover:bg-white/8"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 900);
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-[12px] leading-6 text-white/80">
        <code>{code}</code>
      </pre>
    </div>
  );
}
