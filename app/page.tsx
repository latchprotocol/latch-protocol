"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const FEATURES = [
  {
    title: "Rule-based releases",
    desc: "Define release conditions with explicit counterparties and auditable steps.",
    tag: "Compliance",
  },
  {
    title: "Vault-first architecture",
    desc: "Create drafts, validate parties, then fund and execute. No surprises.",
    tag: "Infra",
  },
  {
    title: "Devnet-ready, mainnet-next",
    desc: "Ship on devnet now; swap RPC + program IDs when you go mainnet.",
    tag: "Rollout",
  },
];

const TRUST = [
  { k: "Finality", v: "~400ms", s: "Solana" },
  { k: "Fees", v: "~$0.001", s: "Typical" },
  { k: "Model", v: "Escrow Vaults", s: "Program" },
  { k: "Modes", v: "Draft → Fund", s: "Workflow" },
];

export default function HomePage() {
  const [copied, setCopied] = useState(false);

  const snippet = useMemo(
    () =>
      `# Latch Protocol\nEscrow rails for serious on-chain deals.\n\n• Draft vaults\n• Fund (devnet)\n• Release / refund (next)\n\nLaunch the app: /app`,
    []
  );

  async function copyOneLiner() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute -top-40 left-1/2 h-[640px] w-[980px] -translate-x-1/2 rounded-full bg-fuchsia-500 blur-[160px]" />
        <div className="absolute bottom-[-260px] right-[-240px] h-[560px] w-[560px] rounded-full bg-cyan-400 blur-[160px]" />
        <div className="absolute bottom-[-260px] left-[-220px] h-[520px] w-[520px] rounded-full bg-emerald-400 blur-[180px] opacity-60" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* Top nav */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 backdrop-blur" />
            <div className="leading-tight">
              <div className="text-sm text-white/60">Solana Escrow</div>
              <div className="font-semibold tracking-wide">Latch Protocol</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/app"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              Launch App
            </Link>
            <button
              onClick={copyOneLiner}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              {copied ? "Copied" : "Copy One-Liner"}
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="mt-14 grid gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live on Devnet
            </div>

            <h1 className="mt-6 text-5xl font-semibold tracking-tight md:text-6xl">
              Escrow rails for
              <br />
              serious on-chain
              <br />
              deals.
            </h1>

            <p className="mt-6 max-w-xl text-base text-white/70 md:text-lg">
              Create escrow vaults, lock funds, and release by rules. Minimal UI,
              maximum trust — built for infra operators, OTC desks, and teams.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:opacity-90"
              >
                Open the Terminal
              </Link>
              <Link
                href="/protocol"
                className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Protocol
              </Link>
            </div>

            {/* Trust stats */}
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {TRUST.map((t) => (
                <div
                  key={t.k}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                >
                  <div className="text-xs text-white/60">{t.k}</div>
                  <div className="mt-1 text-lg font-semibold">{t.v}</div>
                  <div className="mt-1 text-xs text-white/50">{t.s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Launch Checklist</div>
                <div className="mt-1 text-sm text-white/60">
                  What Latch Protocol supports today on Devnet.
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/70">
                v0.1 • Devnet
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{f.title}</div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">
                      {f.tag}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-white/65">{f.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-black/40 p-4 font-mono text-xs text-white/70">
              <div className="text-white/50">Terminal</div>
              <div className="mt-2">
                &gt; connect wallet<br />
                &gt; create vault draft<br />
                &gt; fund (transfer test)<br />
                &gt; release / refund (next)
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-500/70 to-cyan-400/70 px-5 py-3 text-center text-sm font-semibold text-black hover:opacity-90"
              >
                Launch App
              </Link>
              <a
                href="https://docs.solana.com"
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
              >
                Solana Docs
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} Latch Protocol. Devnet preview.</div>
          <div className="flex items-center gap-4">
            <Link href="/app" className="hover:text-white/80">
              App
            </Link>
            <Link href="/protocol" className="hover:text-white/80">
              Protocol
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
