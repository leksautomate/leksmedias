import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/SiteHeader";
import { NavLinks } from "@/components/app/NavLinks";
import { num } from "@/lib/format";

export function AppShell({
  user,
  demo,
  children,
}: {
  user: { email: string; creditBalance: number; plan: string };
  demo: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Logo />
          <div className="flex items-center gap-3">
            <Link
              href="/app/account"
              className="rounded-full border border-line-strong bg-elevated px-4 py-1.5 font-mono text-xs text-soft transition-colors hover:text-white"
              title={`${user.plan} plan`}
            >
              <span className="font-semibold text-white">{num(user.creditBalance)}</span> credits
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-sm text-soft transition-colors hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <NavLinks />
        </div>
      </header>
      {demo && (
        <div role="note" className="border-b border-warn/30 bg-warn/10 px-5 py-2.5 text-center text-sm text-warn">
          Demo mode: research and writing are placeholders and no real sources are read. Add API keys to write real scripts.
        </div>
      )}
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">{children}</main>
    </div>
  );
}
