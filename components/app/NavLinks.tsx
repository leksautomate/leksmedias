"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app", label: "Dashboard", exact: true },
  { href: "/app/new", label: "New script" },
  { href: "/app/account", label: "Account" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="App" className="-mb-px flex gap-1 overflow-x-auto">
      {LINKS.map((l) => {
        const active = l.exact ? path === l.href : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors ${
              active ? "border-gold text-white" : "border-transparent text-soft hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
