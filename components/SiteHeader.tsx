import Link from "next/link";
import { SITE } from "@/lib/site";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-brand" aria-label={`${SITE.name} home`}>
      <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="currentColor" />
        <path d="M18 22h28M18 32h28M18 42h17" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      </svg>
      <span className="text-xl font-bold tracking-tight sm:text-2xl">{SITE.name}</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-4 sm:gap-6" aria-label="Main">
          <Link href="/#how" className="hidden text-sm text-soft hover:text-white sm:block">
            How it works
          </Link>
          <Link href="/pricing" className="text-sm text-soft hover:text-white">
            Pricing
          </Link>
          <Link
            href="/#early-access"
            className="whitespace-nowrap rounded bg-brand px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-hover sm:px-4"
          >
            <span className="sm:hidden">Early access</span>
            <span className="hidden sm:inline">Get early access</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
