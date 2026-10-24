import Link from "next/link";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <p className="font-serif text-2xl italic text-white">{SITE.name}</p>
            <p className="mt-3 text-sm text-soft">{SITE.tagline}</p>
          </div>
          <ul className="flex gap-10 font-mono text-[11px] uppercase tracking-[0.16em] text-mute">
            <li>
              <Link href="/#how" className="hover:text-white">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-white">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/#faq" className="hover:text-white">
                FAQ
              </Link>
            </li>
          </ul>
        </div>
        <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-mute">
          <li>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
          </li>
          <li>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
          </li>
          <li>
            <Link href="/refunds" className="hover:text-white">
              Refunds
            </Link>
          </li>
        </ul>
        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-mute">
          © {new Date().getFullYear()} {SITE.name}. Research powered by TinyFish. {SITE.name} is an independent product
          and is not affiliated with or endorsed by TinyFish. Other product names belong to their owners.
        </p>
      </div>
    </footer>
  );
}
