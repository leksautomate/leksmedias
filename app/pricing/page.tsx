import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/Faq";
import { PricingTable } from "@/components/PricingTable";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
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
        <span className="text-good">Included</span>
      </>
    );
  if (v === false)
    return (
      <>
        <span aria-hidden="true" className="text-dim">
          –
        </span>
        <span className="sr-only">Not included</span>
      </>
    );
  if (v === "Soon") return <span className="text-gold">Soon</span>;
  return <span className="text-ink">{v}</span>;
}

export default function PricingPage() {
  return (
    <>
      <SiteHeader />

      <main>
        <section className="relative isolate overflow-hidden px-5 pb-24 pt-20 sm:px-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_40%_at_50%_0%,rgb(184_150_90/0.14),transparent_70%)]"
          />
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="eyebrow">Self-serve software pricing</p>
              <h1 className="h-display mx-auto mt-4 max-w-3xl text-5xl sm:text-6xl">
                Pay for finished scripts, <em>not for guesses.</em>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-soft">
                One credit is 2,500 words of script. Cited research and both versions are always included.
              </p>
            </div>
            <div className="mt-14">
              <PricingTable />
            </div>
          </div>
        </section>

        {/* Credits explainer */}
        <section className="border-t border-line px-5 py-24 sm:px-8">
          <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-2">
            <div className="min-w-0">
              <p className="eyebrow">Credits</p>
              <h2 className="h-display mt-4 text-4xl">
                How credits <em>work.</em>
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-soft">
                One credit pays for a finished script of up to 2,500 words, about 17 minutes of narration. Longer scripts
                are written section by section and use one credit per section. Standard research and both versions are
                always included, and failed runs are refunded.
              </p>
              <p className="mt-4 leading-relaxed text-soft">
                <span className="font-medium text-white">Deep research</span> sends TinyFish&apos;s research agent to work
                for 5 to 20 minutes across far more sources. It is counted separately from credits because every run has
                a real cost behind it, so each plan includes a set number per month.
              </p>
              <ul className="mt-7 space-y-3 text-soft">
                <li className="card p-5">
                  <span className="font-medium text-white">Need more credits?</span> {TOP_UP.credits} credits for $
                  {TOP_UP.price}. They never expire.
                </li>
                <li className="card p-5">
                  <span className="font-medium text-white">Need more deep runs?</span> {DEEP_PACK.runs} runs for $
                  {DEEP_PACK.price}. They never expire.
                </li>
              </ul>
            </div>
            <div className="relative min-w-0 overflow-x-auto">
              <div className="card min-w-[26rem] overflow-hidden">
                <table className="w-full text-left font-mono text-sm">
                  <caption className="sr-only">Credits and deep research runs by script length</caption>
                  <thead className="bg-elevated text-[11px] uppercase tracking-[0.14em] text-white">
                    <tr className="border-b border-line">
                      <th scope="col" className="px-5 py-4 font-normal">
                        Script
                      </th>
                      <th scope="col" className="px-3 py-4 font-normal">
                        Narration
                      </th>
                      <th scope="col" className="px-3 py-4 text-right font-normal">
                        Credits
                      </th>
                      <th scope="col" className="px-5 py-4 text-right font-normal">
                        Deep runs
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {CREDIT_RULES.map((r) => (
                      <tr key={r.words} className="border-b border-line last:border-0">
                        <th scope="row" className="px-5 py-4 font-medium text-white">
                          {r.words.toLocaleString("en-US")} words
                        </th>
                        <td className="px-3 py-4 text-soft">{r.time}</td>
                        <td className="px-3 py-4 text-right text-good">{r.credits}</td>
                        <td className="px-5 py-4 text-right text-gold">{r.deepRuns}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 font-mono text-[11px] text-mute">
                Deep runs only apply when you pick deep research. Standard research uses none.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="border-t border-line px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="eyebrow">Side-by-side matrix</p>
              <h2 className="h-display mt-4 text-4xl">Compare plan capabilities</h2>
              <p className="mt-3 text-sm text-soft">Transparent software capabilities designed to scale with your volume.</p>
            </div>
            <div className="relative mt-12 overflow-x-auto">
              <div className="card min-w-[44rem] overflow-hidden">
                <table className="w-full text-left font-mono text-sm">
                  <caption className="sr-only">Plan comparison</caption>
                  <thead className="bg-elevated text-[11px] uppercase tracking-[0.14em]">
                    <tr className="border-b border-line">
                      <th scope="col" className="px-5 py-4 font-normal text-white">
                        Capabilities
                      </th>
                      {PLANS.map((p) => (
                        <th
                          key={p.id}
                          scope="col"
                          className={`px-3 py-4 font-normal ${p.featured ? "text-gold" : "text-white"}`}
                        >
                          {p.name}
                          {p.monthly > 0 && <span className="text-mute"> (${p.monthly}/mo)</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row) => (
                      <tr key={row.label} className="border-b border-line last:border-0">
                        <th scope="row" className="px-5 py-4 font-medium text-white">
                          {row.label}
                        </th>
                        {PLANS.map((p) => (
                          <td key={p.id} className="px-3 py-4">
                            <Cell v={row.values[p.id]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line px-5 py-24 sm:px-8">
          <div className="text-center">
            <p className="eyebrow">Pricing FAQ</p>
            <h2 className="h-display mt-4 text-4xl">
              Pricing <em>questions.</em>
            </h2>
          </div>
          <div className="mt-12">
            <Faq items={PRICING_FAQ} />
          </div>
        </section>

        <section className="relative isolate overflow-hidden border-t border-line px-5 py-24 text-center sm:px-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_60%_at_50%_100%,rgb(184_150_90/0.14),transparent_70%)]"
          />
          <h2 className="h-display text-4xl sm:text-5xl">
            Try a full script <em>before you pay.</em>
          </h2>
          <p className="mt-4 text-lg text-soft">Two free credits. No card required.</p>
          <Link href="/#early-access" className="btn btn-primary mt-8">
            Get early access <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
