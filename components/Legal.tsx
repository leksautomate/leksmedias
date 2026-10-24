import Link from "next/link";
import { LEGAL, PLACEHOLDER_LABEL, type LegalKey } from "@/lib/legal";
import type { Block, LegalDocData } from "@/lib/legal-docs";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

function Fill({ k }: { k: LegalKey }) {
  const v = LEGAL[k];
  if (v) {
    return k === "email" ? (
      <a href={`mailto:${v}`} className="text-gold underline underline-offset-4">
        {v}
      </a>
    ) : (
      <>{v}</>
    );
  }
  return (
    <span className="rounded border border-gold/40 bg-gold-soft px-1.5 font-mono text-[0.85em] text-gold">
      [{PLACEHOLDER_LABEL[k]}]
    </span>
  );
}

/** Inline text with **bold** and {{placeholder}} support. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\{\{\w+\}\})/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**")) return <strong key={i} className="font-medium text-white">{part.slice(2, -2)}</strong>;
        const m = part.match(/^\{\{(\w+)\}\}$/);
        if (m && m[1] in LEGAL) return <Fill key={i} k={m[1] as LegalKey} />;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  if (b.t === "p")
    return (
      <p className="leading-relaxed text-soft">
        <Inline text={b.text} />
      </p>
    );
  if (b.t === "ul")
    return (
      <ul className="space-y-3">
        {b.items.map((it) => (
          <li key={it} className="flex gap-3 leading-relaxed text-soft">
            <span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
            <span>
              <Inline text={it} />
            </span>
          </li>
        ))}
      </ul>
    );
  return (
    <div className="relative overflow-x-auto">
      <div className="card min-w-[34rem] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-elevated font-mono text-[11px] uppercase tracking-[0.12em] text-white">
            <tr className="border-b border-line">
              {b.head.map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r) => (
              <tr key={r[0]} className="border-b border-line align-top last:border-0">
                {r.map((c, i) => (
                  <td key={i} className={`px-4 py-3 leading-relaxed ${i === 0 ? "font-medium text-white" : "text-soft"}`}>
                    <Inline text={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const OTHERS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refunds", label: "Refund Policy" },
];

export function LegalDoc({ doc }: { doc: LegalDocData }) {
  return (
    <>
      <SiteHeader />
      <main className="px-5 pb-24 pt-16 sm:px-8 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Legal</p>
          <h1 className="h-display mt-4 text-5xl sm:text-6xl">{doc.title}</h1>
          <p className="mt-4 font-mono text-xs text-mute">Last updated {LEGAL.updated}</p>

          <div className="mt-14 grid gap-12 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <details className="card lg:border-0 lg:bg-transparent" open>
                <summary className="cursor-pointer px-5 py-4 font-mono text-[11px] uppercase tracking-[0.16em] text-gold lg:px-0 lg:pt-0">
                  On this page
                </summary>
                <nav aria-label="On this page" className="border-t border-line px-5 py-4 lg:border-0 lg:px-0">
                  <ol className="space-y-2 text-sm">
                    {doc.sections.map((s, i) => (
                      <li key={s.id}>
                        <a href={`#${s.id}`} className="text-soft transition-colors hover:text-white">
                          <span className="mr-2 font-mono text-[11px] text-mute">{String(i + 1).padStart(2, "0")}</span>
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </details>
            </aside>

            <article className="min-w-0 max-w-3xl">
              <p className="text-lg leading-relaxed text-soft">
                <Inline text={doc.intro} />
              </p>

              <div className="card mt-8 border-gold/30 p-6">
                <p className="eyebrow">In short</p>
                <ul className="mt-4 space-y-3">
                  {doc.summary.map((s) => (
                    <li key={s} className="flex gap-3 leading-relaxed text-ink">
                      <span aria-hidden="true" className="font-mono text-good">
                        ✓
                      </span>
                      <span>
                        <Inline text={s} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-12 space-y-14">
                {doc.sections.map((s, i) => (
                  <section key={s.id} id={s.id} className="scroll-mt-24">
                    <h2 className="font-serif text-3xl text-white">
                      <span className="mr-3 font-mono text-sm text-gold">{String(i + 1).padStart(2, "0")}</span>
                      {s.title}
                    </h2>
                    <div className="mt-5 space-y-5">
                      {s.blocks.map((b, j) => (
                        <BlockView key={j} b={b} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <nav aria-label="Other policies" className="mt-16 flex flex-wrap gap-3 border-t border-line pt-8">
                {OTHERS.filter((o) => o.href !== `/${doc.slug}`).map((o) => (
                  <Link key={o.href} href={o.href} className="btn btn-ghost px-5 py-2.5 text-[13px]">
                    {o.label}
                  </Link>
                ))}
              </nav>
            </article>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
