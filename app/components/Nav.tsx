import Link from "next/link";

const links = [
  { href: "/", label: "Overview" },
  { href: "/protocol", label: "Protocol" },
  { href: "/docs", label: "Docs" },
  { href: "/app", label: "App" }
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="group flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5">
            ⟁
          </span>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold tracking-wide text-white">EscrowX</div>
            <div className="text-[11px] text-white/55">serious settlement infra</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-[13px] text-white/70 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-[12px] font-semibold text-white/85 hover:bg-white/8" href="https://x.com/" target="_blank" rel="noreferrer noopener">
            Follow on X
          </a>
          <a className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-[12px] font-semibold text-white hover:bg-white/8" href="https://github.com/" target="_blank" rel="noreferrer noopener">
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
