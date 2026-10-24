"use client";

import Link from "next/link";
import { useState } from "react";
import { PLANS, perCredit } from "@/lib/pricing";

const usd = (n: number, digits = 0) => `$${n.toFixed(digits)}`;

export function PricingTable() {
  const [yearly, setYearly] = useState(true);

  return (
    <div>
      <div className="flex justify-center">
        <div role="group" aria-label="Billing period" className="inline-flex rounded-full bg-panel-2 p-1">
          {[
            { v: false, label: "Monthly" },
            { v: true, label: "Yearly" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={yearly === o.v}
              onClick={() => setYearly(o.v)}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
                yearly === o.v ? "bg-white text-black" : "text-soft hover:text-white"
              }`}
            >
              {o.label}
              {o.v && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    yearly ? "bg-brand text-white" : "bg-panel-4 text-white"
                  }`}
                >
                  Save 20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => {
          const price = yearly ? p.yearly : p.monthly;
          const cpc = perCredit(p, yearly);
          return (
            <li
              key={p.id}
              className={`relative flex flex-col rounded-lg p-6 ${
                p.featured ? "border-2 border-brand bg-panel-2" : "border border-panel-4 bg-panel"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-6 rounded bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  Most popular
                </span>
              )}
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-soft">{p.blurb}</p>

              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight">{usd(price)}</span>
                {p.monthly > 0 && <span className="text-soft">/ month</span>}
              </p>
              <p className="mt-1 min-h-5 text-sm text-mute">
                {p.monthly === 0
                  ? "No card required"
                  : yearly
                    ? `Billed ${usd(p.yearly * 12)} per year`
                    : "Billed monthly, cancel any time"}
              </p>

              <p className="mt-5 rounded bg-black/40 px-3 py-2 text-sm">
                <span className="font-bold">{p.credits} credits</span>
                <span className="text-soft">{p.creditsOneTime ? " one time" : " every month"}</span>
                {cpc > 0 && <span className="text-mute"> · {usd(cpc, 2)} each</span>}
              </p>

              <Link
                href="/#early-access"
                className={`mt-5 block rounded px-4 py-3 text-center font-bold transition-colors ${
                  p.featured
                    ? "bg-brand text-white hover:bg-brand-hover"
                    : "bg-panel-4 text-white hover:bg-[#4a4a4a]"
                }`}
              >
                {p.cta}
              </Link>

              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f.text} className="flex gap-3">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" />
                    </svg>
                    <span className="text-soft">
                      {f.text}
                      {f.soon && (
                        <span className="ml-2 rounded bg-panel-4 px-1.5 py-0.5 text-[11px] font-bold uppercase text-white">
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
    </div>
  );
}
