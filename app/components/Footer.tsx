export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-white/5">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-white/70">
            © {new Date().getFullYear()} Escrow Protocol
          </div>
          <div className="text-xs text-white/50">
            Infrastructure only. Not financial advice.
          </div>
        </div>
      </div>
    </footer>
  );
}
