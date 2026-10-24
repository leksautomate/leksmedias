"use client";

import Link from "next/link";
import { useState } from "react";
import { PLANS, per1kCredits, yearlyPerMonth, yearlyTotal } from "@/lib/pricing";

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const FREE = PLANS.find((p) => p.id === "free")!;
const PAID = PLANS.filter((p) => p.id !== "free");

export function PricingTable() {
  const [yearly, setYearly] = useState(true);

  return (
    <div>
      <div className="flex justify-center">
        <div role="group" aria-label="Billing period" className="inline-flex rounded-full border border-line bg-elevated p-1">
          {[
            { v: false, label: "Monthly" },
            { v: true, label: "Yearly" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={yearly === o.v}
              onClick={() => setYearly(o.v)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                yearly === o.v ? "bg-white text-bg" : "text-soft hover:text-white"
              }`}
            >
              {o.label}
              {o.v && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
                    yearly ? "bg-gold text-bg" : "bg-gold-dim text-gold"
                  }`}
                >
                  2 months free
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PAID.map((p) => {
          const price = yearly ? yearlyPerMonth(p) : p.monthly;
          return (
            <li
              key={p.id}
              className={`card relative flex flex-col p-7 ${
                p.featured ? "border-gold shadow-[0_0_60px_-24px_var(--color-gold-glow)]" : ""
              }`}
              style={p.featured ? { borderWidth: 2 } : undefined}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-bg">
                  Most popular
                </span>
              )}
              <h3 className="font-serif text-2xl text-white">{p.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-soft">{p.blurb}</p>

              <p className="mt-6 flex items-baseline gap-2">
                <span className={`font-serif text-5xl italic ${p.featured ? "text-gold" : "text-white"}`}>
                  {usd(price)}
                </span>
                <span className="font-mono text-xs text-mute">/ month</span>
              </p>
              <p className="mt-1 min-h-5 font-mono text-[11px] text-mute">
                {yearly ? `Billed ${usd(yearlyTotal(p))} per year` : "Billed monthly, cancel any time"}
              </p>

              <div className="mt-5 space-y-1 rounded-lg border border-line bg-elevated px-3 py-2.5 font-mono text-xs">
                <p>
                  <span className="font-semibold text-white">{p.credits.toLocaleString("en-US")} credits</span>
                  <span className="text-soft"> / month</span>
                </p>
                <p className="text-mute">{usd(per1kCredits(p, yearly))} per 1,000 credits</p>
              </div>

              <Link href="/#early-access" className={`btn mt-5 w-full ${p.featured ? "btn-primary" : "btn-ghost"}`}>
                {p.cta} <span aria-hidden="true">→</span>
              </Link>

              <ul className="mt-6 space-y-3 border-t border-line pt-6 text-sm">
                {p.features.map((f) => (
                  <li key={f.text} className="flex gap-3">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-gold" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
                      <path d="m6.5 10.2 2.3 2.3 4.7-4.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-soft">
                      {f.text}
                      {f.soon && (
                        <span className="ml-2 rounded border border-gold/30 bg-gold-soft px-1.5 py-0.5 font-mono text-[10px] uppercase text-gold">
                          Soon
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      <div className="card mt-5 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <p className="font-serif text-2xl text-white">Try it free first</p>
          <p className="mt-1 text-sm text-soft">
            {FREE.credits} credits, one time. That is about {Math.floor(FREE.credits / 150)} standard scripts with
            standard research and cited sources. No card required.
          </p>
        </div>
        <Link href="/#early-access" className="btn btn-ghost shrink-0">
          {FREE.cta} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
