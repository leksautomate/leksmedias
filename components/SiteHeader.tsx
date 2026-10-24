import Link from "next/link";
import { SITE } from "@/lib/site";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label={`${SITE.name} home`}>
      <span className="font-serif text-[1.65rem] italic leading-none text-white">{SITE.name}</span>
      <span className="hidden rounded-full border border-gold/30 bg-gold-soft px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-gold min-[420px]:inline">
        {SITE.chip}
      </span>
    </Link>
  );
}

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#research", label: "Research" },
  { href: "/#agents", label: "Agents" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-[73px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-9 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-soft transition-colors hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm text-soft transition-colors hover:text-white md:hidden">
            Pricing
          </Link>
          <Link href="/#early-access" className="btn btn-primary px-5 py-2.5 text-[13px]">
            <span className="sm:hidden">Early access</span>
            <span className="hidden sm:inline">Get early access</span> <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
