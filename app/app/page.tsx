"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

type VaultStatus = "draft" | "funded" | "released" | "refunded";

type Vault = {
  id: string;
  createdAt: number;
  amountSol: number;
  counterparty: string;
  status: VaultStatus;
  memo?: string;
};

type Activity = {
  id: string;
  ts: number;
  message: string;
};

type Role = "creator" | "counterparty" | "arbitrator";

const LS_VAULTS = "latch_escrow_vaults_v1";
const LS_ACTIVITY = "latch_escrow_activity_v1";
const LS_ROLE = "latch_escrow_role_v1";

function now() {
  return Date.now();
}

function shortAddr(s: string) {
  if (!s) return "";
  if (s.length <= 10) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function uid(prefix = "v") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clampSol(x: number) {
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.round(x * 10000) / 10000;
}

function statusBadgeClasses(s: VaultStatus) {
  const base = "inline-flex items-center rounded-full border px-2 py-1 text-xs transition";
  if (s === "draft") return `${base} border-white/15 bg-white/5 text-white/70`;
  if (s === "funded") return `${base} border-emerald-400/25 bg-emerald-400/10 text-emerald-200`;
  if (s === "released") return `${base} border-cyan-300/25 bg-cyan-300/10 text-cyan-100`;
  return `${base} border-rose-300/25 bg-rose-300/10 text-rose-100`;
}

function statusGlowRing(s: VaultStatus) {
  if (s === "funded") return "ring-1 ring-emerald-400/25";
  if (s === "released") return "ring-1 ring-cyan-300/25";
  if (s === "refunded") return "ring-1 ring-rose-300/25";
  return "ring-1 ring-white/10";
}

function rolePill(role: Role) {
  const base = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold";
  if (role === "creator") return `${base} border-white/15 bg-white/10 text-white`;
  if (role === "counterparty") return `${base} border-cyan-300/25 bg-cyan-300/10 text-cyan-100`;
  return `${base} border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200`;
}

function roleLabel(role: Role) {
  if (role === "creator") return "Creator";
  if (role === "counterparty") return "Counterparty";
  return "Arbitrator";
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadJson(filename: string, data: any) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

type FilterKey = "all" | "draft" | "funded" | "closed";
type SortKey = "newest" | "oldest" | "amount_desc" | "amount_asc";

export default function AppPage() {
  const [amount, setAmount] = useState<string>("0.01");
  const [counterparty, setCounterparty] = useState<string>("");
  const [memo, setMemo] = useState<string>("");

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [statusPulseKey, setStatusPulseKey] = useState<number>(0);
  const [lastActivityFlash, setLastActivityFlash] = useState<number>(0);

  // Operator controls
  const [search, setSearch] = useState<string>("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  // Roles
  const [role, setRole] = useState<Role>("creator");

  const logRef = useRef<HTMLDivElement | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_VAULTS);
      const a = localStorage.getItem(LS_ACTIVITY);
      const r = localStorage.getItem(LS_ROLE);
      if (v) setVaults(JSON.parse(v));
      if (a) setActivity(JSON.parse(a));
      if (r === "creator" || r === "counterparty" || r === "arbitrator") setRole(r);
    } catch {
      // ignore
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_VAULTS, JSON.stringify(vaults));
    } catch {}
  }, [vaults]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_ACTIVITY, JSON.stringify(activity));
    } catch {}
  }, [activity]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_ROLE, role);
    } catch {}
  }, [role]);

  // Auto-scroll activity
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activity.length]);

  const selectedVault = useMemo(
    () => vaults.find((v) => v.id === selectedId) ?? null,
    [vaults, selectedId]
  );

  // Locked balance meter
  const lockedTotal = useMemo(() => {
    return vaults.filter((v) => v.status === "funded").reduce((sum, v) => sum + v.amountSol, 0);
  }, [vaults]);

  const totalVolume = useMemo(() => {
    return vaults.reduce((sum, v) => sum + v.amountSol, 0);
  }, [vaults]);

  const lockedPct = useMemo(() => {
    if (totalVolume <= 0) return 0;
    const pct = (lockedTotal / totalVolume) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [lockedTotal, totalVolume]);

  function pushActivity(message: string) {
    setActivity((prev) => [...prev, { id: uid("a"), ts: now(), message }]);
    setLastActivityFlash(Date.now());
  }

  function bumpPulse() {
    setStatusPulseKey((k) => k + 1);
  }

  // ---------- Permissions (UI-mode rules) ----------
  // Rules (for optics + future protocol parity):
  // - Create Draft: Creator only
  // - Fund: Creator only, only if Draft
  // - Release: Creator OR Arbitrator, only if Funded
  // - Refund:  Creator OR Arbitrator, only if Funded
  // - Delete:  Creator only, only if NOT funded (draft/released/refunded)
  function canCreateDraft() {
    if (role !== "creator") return { ok: false, why: "Only the Creator can create vaults." };
    return { ok: true, why: "" };
  }

  function canFund(v: Vault | null) {
    if (!v) return { ok: false, why: "Select a vault first." };
    if (v.status !== "draft") return { ok: false, why: "Only Draft vaults can be funded." };
    if (role !== "creator") return { ok: false, why: "Only the Creator can fund a vault." };
    return { ok: true, why: "" };
  }

  function canRelease(v: Vault | null) {
    if (!v) return { ok: false, why: "Select a vault first." };
    if (v.status !== "funded") return { ok: false, why: "Only Funded vaults can be released." };
    if (role !== "creator" && role !== "arbitrator") return { ok: false, why: "Only Creator or Arbitrator can release." };
    return { ok: true, why: "" };
  }

  function canRefund(v: Vault | null) {
    if (!v) return { ok: false, why: "Select a vault first." };
    if (v.status !== "funded") return { ok: false, why: "Only Funded vaults can be refunded." };
    if (role !== "creator" && role !== "arbitrator") return { ok: false, why: "Only Creator or Arbitrator can refund." };
    return { ok: true, why: "" };
  }

  function canDelete(v: Vault | null) {
    if (!v) return { ok: false, why: "Select a vault first." };
    if (v.status === "funded") return { ok: false, why: "Funded vaults cannot be deleted." };
    if (role !== "creator") return { ok: false, why: "Only the Creator can delete vault records." };
    return { ok: true, why: "" };
  }

  // ---------- Actions ----------
  function createDraft() {
    const perm = canCreateDraft();
    if (!perm.ok) {
      pushActivity(`✖ ${perm.why} (switch role to Creator)`);
      return;
    }

    const amt = clampSol(parseFloat(amount));
    if (!amt || amt <= 0) {
      pushActivity("✖ Enter a valid Amount (SOL).");
      return;
    }
    if (!counterparty.trim()) {
      pushActivity("✖ Enter a counterparty wallet (base58).");
      return;
    }

    const v: Vault = {
      id: uid("vault"),
      createdAt: now(),
      amountSol: amt,
      counterparty: counterparty.trim(),
      status: "draft",
      memo: memo.trim() || undefined,
    };

    setVaults((prev) => [v, ...prev]);
    setSelectedId(v.id);
    bumpPulse();
    pushActivity(`✓ Draft created: ${amt} SOL → ${shortAddr(v.counterparty)} (${v.id.slice(0, 10)}…)`);
  }

  function fundVault(id: string) {
    const v = vaults.find((x) => x.id === id) ?? null;
    const perm = canFund(v);
    if (!perm.ok) {
      pushActivity(`✖ ${perm.why}`);
      return;
    }

    setVaults((prev) => prev.map((x) => (x.id === id ? { ...x, status: "funded" } : x)));
    bumpPulse();
    if (v) pushActivity(`⇢ Funded (locked): ${v.amountSol} SOL in vault ${v.id.slice(0, 10)}…`);
  }

  function releaseVault(id: string) {
    const v = vaults.find((x) => x.id === id) ?? null;
    const perm = canRelease(v);
    if (!perm.ok) {
      pushActivity(`✖ ${perm.why}`);
      return;
    }

    setVaults((prev) => prev.map((x) => (x.id === id ? { ...x, status: "released" } : x)));
    bumpPulse();
    if (v) pushActivity(`⇢ Released to counterparty: ${shortAddr(v.counterparty)} (vault ${v.id.slice(0, 10)}…)`);
  }

  function refundVault(id: string) {
    const v = vaults.find((x) => x.id === id) ?? null;
    const perm = canRefund(v);
    if (!perm.ok) {
      pushActivity(`✖ ${perm.why}`);
      return;
    }

    setVaults((prev) => prev.map((x) => (x.id === id ? { ...x, status: "refunded" } : x)));
    bumpPulse();
    if (v) pushActivity(`⇢ Refunded to creator (simulated) for vault ${v.id.slice(0, 10)}…`);
  }

  function deleteVault(id: string) {
    const v = vaults.find((x) => x.id === id) ?? null;
    const perm = canDelete(v);
    if (!perm.ok) {
      pushActivity(`✖ ${perm.why}`);
      return;
    }

    setVaults((prev) => prev.filter((x) => x.id !== id));
    if (selectedId === id) setSelectedId(null);
    bumpPulse();
    pushActivity(`⌫ Vault deleted: ${id.slice(0, 10)}…`);
  }

  function clearAll() {
    // keep as operator action; no role restriction (UI-mode dev tool)
    setVaults([]);
    setSelectedId(null);
    setActivity([]);
    bumpPulse();
  }

  // Filtering + Search + Sort
  const filteredVaults = useMemo(() => {
    const q = search.trim().toLowerCase();
    const isClosed = (s: VaultStatus) => s === "released" || s === "refunded";

    let list = [...vaults];

    if (filter === "draft") list = list.filter((v) => v.status === "draft");
    if (filter === "funded") list = list.filter((v) => v.status === "funded");
    if (filter === "closed") list = list.filter((v) => isClosed(v.status));

    if (q) {
      list = list.filter((v) => {
        const hay = `${v.id} ${v.counterparty} ${v.memo ?? ""} ${v.status}`.toLowerCase();
        return hay.includes(q);
      });
    }

    list.sort((a, b) => {
      if (sort === "newest") return b.createdAt - a.createdAt;
      if (sort === "oldest") return a.createdAt - b.createdAt;
      if (sort === "amount_desc") return b.amountSol - a.amountSol;
      if (sort === "amount_asc") return a.amountSol - b.amountSol;
      return 0;
    });

    return list;
  }, [vaults, search, filter, sort]);

  const primaryBtn =
    "rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed";
  const ghostBtn =
    "rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed";

  // Export actions
  async function exportSelectedVaultCopy() {
    if (!selectedVault) return;
    const payload = {
      type: "vault",
      exportedAt: new Date().toISOString(),
      roleContext: role,
      vault: selectedVault,
    };
    const ok = await copyText(JSON.stringify(payload, null, 2));
    pushActivity(ok ? "⧉ Copied selected vault JSON." : "✖ Copy failed (clipboard blocked).");
  }

  function exportSelectedVaultDownload() {
    if (!selectedVault) return;
    const payload = {
      type: "vault",
      exportedAt: new Date().toISOString(),
      roleContext: role,
      vault: selectedVault,
    };
    const ok = downloadJson(`vault_${selectedVault.id.slice(0, 10)}.json`, payload);
    pushActivity(ok ? "⇣ Downloaded selected vault JSON." : "✖ Download failed.");
  }

  async function exportActivityCopy() {
    const payload = {
      type: "activity_log",
      exportedAt: new Date().toISOString(),
      roleContext: role,
      events: activity,
    };
    const ok = await copyText(JSON.stringify(payload, null, 2));
    pushActivity(ok ? "⧉ Copied activity log JSON." : "✖ Copy failed (clipboard blocked).");
  }

  function exportActivityDownload() {
    const payload = {
      type: "activity_log",
      exportedAt: new Date().toISOString(),
      roleContext: role,
      events: activity,
    };
    const ok = downloadJson(`activity_log_${new Date().toISOString().slice(0, 10)}.json`, payload);
    pushActivity(ok ? "⇣ Downloaded activity log JSON." : "✖ Download failed.");
  }

  const permFund = canFund(selectedVault);
  const permRelease = canRelease(selectedVault);
  const permRefund = canRefund(selectedVault);
  const permDelete = canDelete(selectedVault);
  const permCreate = canCreateDraft();

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-fuchsia-500 blur-[140px]" />
        <div className="absolute bottom-[-200px] right-[-200px] h-[520px] w-[520px] rounded-full bg-cyan-400 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* Local animations */}
        <style>{`
          @keyframes pulseSoft {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.01); opacity: .95; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes flashIn {
            0% { box-shadow: 0 0 0 rgba(255,255,255,0); }
            30% { box-shadow: 0 0 0 2px rgba(255,255,255,.10), 0 0 30px rgba(34,211,238,.12); }
            100% { box-shadow: 0 0 0 rgba(255,255,255,0); }
          }
          @keyframes glowBar {
            0% { filter: brightness(1); }
            50% { filter: brightness(1.25); }
            100% { filter: brightness(1); }
          }
        `}</style>

        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/5" />
            <div className="leading-tight">
              <div className="text-sm text-white/60">Solana Escrow</div>
              <div className="font-semibold tracking-wide">Latch Protocol</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={rolePill(role)}>{roleLabel(role)}</span>
            <Link href="/" className="text-sm text-white/60 hover:text-white">
              ← Back
            </Link>
            <WalletMultiButton />
          </div>
        </header>

        {/* Locked Balance Meter */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs text-white/60">Locked Balance (UI-mode)</div>
              <div className="mt-1 text-2xl font-semibold">
                {lockedTotal.toFixed(4)} <span className="text-white/50">SOL</span>
              </div>
              <div className="mt-1 text-xs text-white/45">
                {vaults.filter((v) => v.status === "funded").length} funded vault(s) • {vaults.length} total vault(s)
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-white/60">Total Volume</div>
              <div className="mt-1 text-sm font-semibold text-white/80">{totalVolume.toFixed(4)} SOL</div>
              <div className="mt-1 text-xs text-white/45">Locked ratio: {lockedPct.toFixed(1)}%</div>
            </div>
          </div>

          <div className="mt-4 h-3 w-full overflow-hidden rounded-full border border-white/10 bg-black/40">
            <div
              className="h-full rounded-full bg-white"
              style={{
                width: `${lockedPct}%`,
                transition: "width 700ms cubic-bezier(.2,.9,.2,1)",
                animation: lockedPct > 0 ? "glowBar 2.2s ease-in-out infinite" : undefined,
              }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left: Terminal */}
          <section
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            style={{ animation: "pulseSoft 650ms ease", animationIterationCount: 1, animationDelay: "0ms" }}
            key={`terminal_${statusPulseKey}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Escrow Terminal</h2>
                <p className="mt-1 text-sm text-white/60">Operator-grade escrow UX (mock engine). Protocol roles enforced.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">Vault Ops</span>
            </div>

            {/* Role Switch */}
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs text-white/60">Role</div>
                  <div className="mt-1 text-sm font-semibold">Acting as: {roleLabel(role)}</div>
                  <div className="mt-1 text-xs text-white/45">
                    Permissions are enforced by role (UI-mode). Later, wallet keys map to roles on-chain.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={role}
                    onChange={(e) => {
                      const r = e.target.value as Role;
                      setRole(r);
                      pushActivity(`⇢ Role switched: ${roleLabel(r)}`);
                      bumpPulse();
                    }}
                    className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
                  >
                    <option value="creator">Creator</option>
                    <option value="counterparty">Counterparty</option>
                    <option value="arbitrator">Arbitrator</option>
                  </select>
                </div>
              </div>

              {/* Rule panel */}
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/65">
                  <div className="font-semibold text-white/80">Rules</div>
                  <div className="mt-1">• Create Draft: <span className="text-white/85">Creator</span></div>
                  <div>• Fund: <span className="text-white/85">Creator</span> (Draft only)</div>
                  <div>• Release: <span className="text-white/85">Creator or Arbitrator</span> (Funded only)</div>
                  <div>• Refund: <span className="text-white/85">Creator or Arbitrator</span> (Funded only)</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/65">
                  <div className="font-semibold text-white/80">Notes</div>
                  <div className="mt-1">• Counterparty has read-only visibility in UI-mode.</div>
                  <div>• Arbitrator can resolve disputes (Release/Refund).</div>
                  <div>• Funded vaults cannot be deleted.</div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-white/60">Amount (SOL)</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 0.01"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Counterparty wallet (base58)</label>
                <input
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  placeholder="Paste a Solana address"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-white/60">Memo (optional)</label>
                <input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="e.g. OTC deal #421 / milestone escrow"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button className={primaryBtn} onClick={createDraft} title={!permCreate.ok ? permCreate.why : ""} disabled={!permCreate.ok}>
                Create Vault Draft
              </button>

              <button className={ghostBtn} onClick={() => selectedVault && fundVault(selectedVault.id)} disabled={!permFund.ok} title={!permFund.ok ? permFund.why : ""}>
                Fund (lock)
              </button>

              <button className={ghostBtn} onClick={() => selectedVault && releaseVault(selectedVault.id)} disabled={!permRelease.ok} title={!permRelease.ok ? permRelease.why : ""}>
                Release
              </button>

              <button className={ghostBtn} onClick={() => selectedVault && refundVault(selectedVault.id)} disabled={!permRefund.ok} title={!permRefund.ok ? permRefund.why : ""}>
                Refund
              </button>

              <button className={ghostBtn} onClick={() => selectedVault && deleteVault(selectedVault.id)} disabled={!permDelete.ok} title={!permDelete.ok ? permDelete.why : ""}>
                Delete
              </button>

              <button className={ghostBtn} onClick={clearAll} title="Dev tool: clears everything">
                Clear All
              </button>
            </div>

            {/* Activity */}
            <div
              className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4"
              style={Date.now() - lastActivityFlash < 900 ? { animation: "flashIn 900ms ease" } : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/60">Activity</div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                    onClick={exportActivityCopy}
                    title="Copy activity log JSON to clipboard"
                  >
                    Copy Log JSON
                  </button>
                  <button
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                    onClick={exportActivityDownload}
                    title="Download activity log JSON"
                  >
                    Download Log
                  </button>
                </div>
              </div>

              <div ref={logRef} className="mt-3 max-h-52 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs text-white/70">
                {activity.length === 0 ? (
                  <div className="text-white/40">&gt; switch role &gt; create vault &gt; fund &gt; release/refund</div>
                ) : (
                  activity.map((a) => (
                    <div key={a.id} className="py-1">
                      <span className="text-white/35">{new Date(a.ts).toLocaleTimeString()}</span>{" "}
                      <span>{a.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Vault Details */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-white/60">Selected Vault</div>
                  <div className="mt-1 text-sm font-semibold">
                    {selectedVault ? `${selectedVault.amountSol} SOL → ${shortAddr(selectedVault.counterparty)}` : "None"}
                  </div>
                  {selectedVault ? <div className="mt-1 text-xs text-white/45">{selectedVault.id}</div> : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40"
                    disabled={!selectedVault}
                    onClick={async () => {
                      if (!selectedVault) return;
                      const ok = await copyText(selectedVault.id);
                      pushActivity(ok ? `⧉ Copied vault id: ${selectedVault.id.slice(0, 10)}…` : "✖ Copy failed (clipboard blocked).");
                    }}
                  >
                    Copy ID
                  </button>

                  <button
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40"
                    disabled={!selectedVault}
                    onClick={exportSelectedVaultCopy}
                    title="Copy selected vault JSON"
                  >
                    Copy Vault JSON
                  </button>

                  <button
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40"
                    disabled={!selectedVault}
                    onClick={exportSelectedVaultDownload}
                    title="Download selected vault JSON"
                  >
                    Download Vault
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="mt-4 grid gap-3 md:grid-cols-4" key={`timeline_${statusPulseKey}`}>
                {[
                  {
                    label: "Draft",
                    on:
                      selectedVault?.status === "draft" ||
                      selectedVault?.status === "funded" ||
                      selectedVault?.status === "released" ||
                      selectedVault?.status === "refunded",
                  },
                  { label: "Funded", on: selectedVault?.status === "funded" || selectedVault?.status === "released" || selectedVault?.status === "refunded" },
                  { label: "Released", on: selectedVault?.status === "released" },
                  { label: "Refunded", on: selectedVault?.status === "refunded" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={[
                      "rounded-xl border px-4 py-3 text-sm transition",
                      s.on ? "border-white/25 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/45",
                    ].join(" ")}
                    style={selectedVault ? { animation: "pulseSoft 520ms ease" } : undefined}
                  >
                    <div className="text-xs text-white/60">Stage</div>
                    <div className="mt-1 font-semibold">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Selected vault metadata */}
              {selectedVault ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs text-white/60">Counterparty</div>
                    <div className="mt-1 font-mono text-xs text-white/80 break-all">{selectedVault.counterparty}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs text-white/60">Memo</div>
                    <div className="mt-1 text-sm text-white/80">{selectedVault.memo ?? "—"}</div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/50">
                  Select a vault from the right panel to see full details + audit exports.
                </div>
              )}

              {/* Actions (permission-aware) */}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => selectedVault && fundVault(selectedVault.id)}
                  disabled={!permFund.ok}
                  title={!permFund.ok ? permFund.why : ""}
                >
                  Fund (lock)
                </button>

                <button
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => selectedVault && releaseVault(selectedVault.id)}
                  disabled={!permRelease.ok}
                  title={!permRelease.ok ? permRelease.why : ""}
                >
                  Release
                </button>

                <button
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => selectedVault && refundVault(selectedVault.id)}
                  disabled={!permRefund.ok}
                  title={!permRefund.ok ? permRefund.why : ""}
                >
                  Refund
                </button>
              </div>
            </div>
          </section>

          {/* Right: Vaults list + Operator controls */}
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vaults</h3>
              <div className="text-sm text-white/50">{filteredVaults.length}</div>
            </div>

            <div className="mt-4 grid gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search: id / counterparty / memo / status"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-white/60 mb-2">Filter</div>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as FilterKey)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/20"
                  >
                    <option value="all">All</option>
                    <option value="draft">Draft</option>
                    <option value="funded">Funded</option>
                    <option value="closed">Closed (Released/Refunded)</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs text-white/60 mb-2">Sort</div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/20"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="amount_desc">Amount (High → Low)</option>
                    <option value="amount_asc">Amount (Low → High)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                    setSort("newest");
                    pushActivity("↺ Operator view reset (search/filter/sort).");
                  }}
                >
                  Reset View
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {filteredVaults.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/50">
                  No vaults match your filters/search.
                </div>
              ) : (
                filteredVaults.map((v) => {
                  const isSel = v.id === selectedId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedId(v.id)}
                      className={[
                        "w-full rounded-xl border p-4 text-left transition",
                        isSel ? "border-white/25 bg-white/10" : "border-white/10 bg-black/30 hover:bg-white/5",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">
                            {v.amountSol} SOL <span className="text-white/40">→</span> {shortAddr(v.counterparty)}
                          </div>
                          <div className="mt-1 text-xs text-white/45">
                            {new Date(v.createdAt).toLocaleString()} • {v.id.slice(0, 10)}…
                          </div>
                          {v.memo ? (
                            <div className="mt-2 text-xs text-white/60">
                              Memo: <span className="text-white/80">{v.memo}</span>
                            </div>
                          ) : null}
                        </div>

                        <div className={statusBadgeClasses(v.status)}>{v.status}</div>
                      </div>

                      <div className={`mt-3 rounded-xl ${statusGlowRing(v.status)}`} />
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
