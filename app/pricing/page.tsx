import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/Faq";
import { Logo } from "@/components/SiteHeader";
import { PricingTable } from "@/components/PricingTable";
import { SiteFooter } from "@/components/SiteFooter";
import { COMPARISON, CREDIT_RULES, DEEP_PACK, PLANS, PRICING_FAQ, TOP_UP } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Pay per finished script. Every credit includes cited research, a script with visual cues and a clean script with sources.",
};

function Cell({ v }: { v: string | boolean }) {
  if (v === true)
    return (
      <>
        <span aria-hidden="true" className="text-brand">
          ✓
        </span>
        <span className="sr-only">Included</span>
      </>
    );
  if (v === false)
    return (
      <>
        <span aria-hidden="true" className="text-mute">
          –
        </span>
        <span className="sr-only">Not included</span>
      </>
    );
  return <>{v}</>;
}

export default function PricingPage() {
  return (
    <>
      <header className="border-b border-panel">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Logo />
          <Link
            href="/#early-access"
            className="whitespace-nowrap rounded bg-brand px-4 py-2 text-sm font-bold transition-colors hover:bg-brand-hover"
          >
            Get early access
          </Link>
        </div>
      </header>

      <main>
        <section className="divider px-5 pb-20 pt-16 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-balance text-center text-4xl font-bold tracking-tight sm:text-[3.5rem]">
              Pay for finished scripts, not for guesses
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-center text-lg text-soft sm:text-2xl">
              One credit is 2,500 words of script. Cited research and both versions are always included.
            </p>
            <div className="mt-12">
              <PricingTable />
            </div>
          </div>
        </section>

        {/* Credits explainer */}
        <section className="divider px-5 py-20 sm:px-8">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
            <div className="min-w-0">
              <h2 className="text-3xl font-bold sm:text-4xl">How credits work</h2>
              <p className="mt-4 text-lg text-soft">
                One credit pays for a finished script of up to 2,500 words, about 17 minutes of narration. Longer
                scripts are written section by section and use one credit per section. Standard research and both
                versions are always included, and failed runs are refunded.
              </p>
              <p className="mt-4 text-lg text-soft">
                <span className="font-bold text-white">Deep research</span> sends TinyFish&apos;s research agent to work
                for 5 to 20 minutes across far more sources. It is counted separately from credits because every run
                has a real cost behind it, so each plan includes a set number per month.
              </p>
              <ul className="mt-6 space-y-3 text-soft">
                <li className="rounded-lg bg-panel-2 p-5">
                  <span className="font-bold text-white">Need more credits?</span> {TOP_UP.credits} credits for $
                  {TOP_UP.price}. They never expire.
                </li>
                <li className="rounded-lg bg-panel-2 p-5">
                  <span className="font-bold text-white">Need more deep runs?</span> {DEEP_PACK.runs} runs for $
                  {DEEP_PACK.price}. They never expire.
                </li>
              </ul>
            </div>
            <div className="relative min-w-0 overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left">
                <caption className="sr-only">Credits and deep research runs by script length</caption>
                <thead className="text-sm text-mute">
                  <tr className="border-b border-panel-4">
                    <th scope="col" className="py-3 pr-4 font-normal">
                      Script
                    </th>
                    <th scope="col" className="py-3 pr-4 font-normal">
                      Narration
                    </th>
                    <th scope="col" className="py-3 pr-4 text-right font-normal">
                      Credits
                    </th>
                    <th scope="col" className="py-3 text-right font-normal">
                      Deep runs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {CREDIT_RULES.map((r) => (
                    <tr key={r.words} className="border-b border-panel-2">
                      <th scope="row" className="py-4 pr-4 font-bold">
                        {r.words.toLocaleString("en-US")} words
                      </th>
                      <td className="py-4 pr-4 text-soft">{r.time}</td>
                      <td className="py-4 pr-4 text-right text-xl font-bold">{r.credits}</td>
                      <td className="py-4 text-right text-xl font-bold">{r.deepRuns}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm text-mute">
                Deep runs only apply when you pick deep research. Standard research uses none.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="divider px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold sm:text-4xl">Compare plans</h2>
            <div className="relative mt-8 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left">
                <caption className="sr-only">Plan comparison</caption>
                <thead>
                  <tr className="border-b border-panel-4">
                    <td className="py-4" />
                    {PLANS.map((p) => (
                      <th
                        key={p.id}
                        scope="col"
                        className={`px-3 py-4 text-center text-lg font-bold ${p.featured ? "text-brand" : ""}`}
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.label} className="border-b border-panel-2">
                      <th scope="row" className="py-4 pr-4 font-normal text-soft">
                        {row.label}
                      </th>
                      {PLANS.map((p) => (
                        <td key={p.id} className="px-3 py-4 text-center">
                          <Cell v={row.values[p.id]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="divider px-5 py-20 sm:px-8">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Pricing questions</h2>
          <div className="mt-10">
            <Faq items={PRICING_FAQ} />
          </div>
        </section>

        <section className="px-5 py-20 text-center sm:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Try a full script before you pay</h2>
          <p className="mt-3 text-lg text-soft">Two free credits. No card required.</p>
          <Link
            href="/#early-access"
            className="mt-7 inline-block rounded bg-brand px-8 py-4 text-xl font-bold transition-colors hover:bg-brand-hover"
          >
            Get early access
          </Link>
        </section>
      </main>
      <div className="border-t-8 border-panel">
        <SiteFooter />
      </div>
    </>
  );
}
