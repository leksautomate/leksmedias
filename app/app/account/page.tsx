import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { logoutAction } from "@/app/(auth)/actions";
import { getDb } from "@/db";
import { creditLedger } from "@/db/schema";
import { planFor } from "@/lib/core/credits";
import { num } from "@/lib/format";
import { requireVerifiedUser } from "@/lib/server/dal";

export const metadata: Metadata = { title: "Account" };

const KIND: Record<string, string> = {
  grant: "Credits added",
  plan_grant: "Plan credits",
  topup: "Top-up",
  spend: "Script",
  refund: "Refund",
  adjust: "Adjustment",
};

export default async function Account() {
  const user = await requireVerifiedUser();
  const plan = planFor(user.plan);
  const rows = await getDb().select().from(creditLedger).where(eq(creditLedger.userId, user.id)).orderBy(desc(creditLedger.id)).limit(40);

  return (
    <div className="space-y-12">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="h-display mt-3 text-4xl sm:text-5xl">Your <em>account.</em></h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-6"><p className="font-mono text-[11px] uppercase tracking-wider text-mute">Email</p><p className="mt-2 break-all text-white">{user.email}</p>{user.name && <p className="mt-1 text-sm text-soft">{user.name}</p>}</div>
        <div className="card p-6">
          <p className="font-mono text-[11px] uppercase tracking-wider text-mute">Plan</p>
          <p className="mt-2 font-serif text-3xl text-white">{plan.name}</p>
          <p className="mt-1 text-sm text-soft">Scripts up to {num(plan.maxWords)} words{plan.deepResearch ? ", deep research included" : ""}.</p>
          <Link href="/pricing" className="mt-3 inline-block font-mono text-xs text-gold underline underline-offset-4">Compare plans</Link>
        </div>
        <div className="card p-6"><p className="font-mono text-[11px] uppercase tracking-wider text-mute">Credits</p><p className="mt-2 font-serif text-5xl text-white">{num(user.creditBalance)}</p></div>
      </div>

      <p className="rounded-xl border border-line p-4 text-sm leading-relaxed text-soft">
        Paid plans and credit top-ups open at launch. Until then your free credits are all you need to try the product.
      </p>

      <section aria-label="Credit history">
        <h2 className="font-serif text-2xl text-white">Credit history</h2>
        {rows.length === 0 ? (
          <p className="mt-4 text-soft">Nothing yet.</p>
        ) : (
          <div className="card mt-5 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left font-mono text-sm">
              <caption className="sr-only">Credit history</caption>
              <thead className="bg-elevated text-[11px] uppercase tracking-[0.14em] text-white">
                <tr className="border-b border-line">
                  <th scope="col" className="px-5 py-3 font-normal">When</th>
                  <th scope="col" className="px-3 py-3 font-normal">What</th>
                  <th scope="col" className="px-3 py-3 text-right font-normal">Credits</th>
                  <th scope="col" className="px-5 py-3 text-right font-normal">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 text-soft">{r.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC</td>
                    <td className="px-3 py-3 text-ink">{KIND[r.kind] ?? r.kind}{r.note ? <span className="block text-[11px] text-mute">{r.note}</span> : null}</td>
                    <td className={`px-3 py-3 text-right ${r.amount < 0 ? "text-bad" : "text-good"}`}>{r.amount > 0 ? "+" : ""}{num(r.amount)}</td>
                    <td className="px-5 py-3 text-right text-soft">{num(r.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form action={logoutAction}>
        <button type="submit" className="btn btn-ghost">Sign out</button>
      </form>
    </div>
  );
}
