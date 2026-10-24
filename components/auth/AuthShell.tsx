import Link from "next/link";
import { Logo } from "@/components/SiteHeader";

export function AuthShell({ title, subtitle, children, footer }: { title: React.ReactNode; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_40%_at_50%_0%,rgb(184_150_90/0.14),transparent_70%)]"
      />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Logo />
        <Link href="/pricing" className="text-sm text-soft hover:text-white">
          Pricing
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pb-20 pt-6 sm:pt-12">
        <div className="w-full max-w-md">
          <h1 className="h-display text-4xl sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-3 text-soft">{subtitle}</p>}
          <div className="card mt-8 p-6 sm:p-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-soft">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
