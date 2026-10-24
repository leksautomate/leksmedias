import Link from "next/link";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-5 py-14 text-sm text-mute sm:px-8">
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
        <div className="max-w-sm">
          <p className="font-bold text-soft">{SITE.name}</p>
          <p className="mt-2">{SITE.tagline}</p>
        </div>
        <ul className="flex gap-8">
          <li>
            <Link href="/#how" className="hover:text-white hover:underline">
              How it works
            </Link>
          </li>
          <li>
            <Link href="/pricing" className="hover:text-white hover:underline">
              Pricing
            </Link>
          </li>
          <li>
            <Link href="/#faq" className="hover:text-white hover:underline">
              FAQ
            </Link>
          </li>
        </ul>
      </div>
      <p className="mt-10 text-xs">
        © {new Date().getFullYear()} {SITE.name}. Research powered by TinyFish. {SITE.name} is an independent product
        and is not affiliated with or endorsed by TinyFish. Other product names belong to their owners.
      </p>
    </footer>
  );
}
