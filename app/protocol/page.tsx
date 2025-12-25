export default function ProtocolPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 text-white">
      <h1 className="text-3xl font-semibold">Protocol</h1>
      <p className="mt-2 text-white/70">
        Escrow state machine, signatures, receipts, dispute rules, and timeouts.
      </p>

      <div className="mt-8 grid gap-4">
        <div className="card neon p-6">
          <div className="text-sm font-semibold">States</div>
          <p className="mt-2 text-sm text-white/70">
            Create → Funded → Released / Refunded, with explicit Disputed + TimedOut branches.
          </p>
        </div>

        <div className="card neon p-6">
          <div className="text-sm font-semibold">Receipts & Proof</div>
          <p className="mt-2 text-sm text-white/70">
            Every action produces a signed receipt that can be audited and verified by third parties.
          </p>
        </div>
      </div>
    </main>
  );
}
