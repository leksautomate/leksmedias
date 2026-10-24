export function Faq({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((it) => (
        <details key={it.q} className="card group overflow-hidden transition-colors open:border-line-strong">
          <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-base font-medium text-ink hover:bg-hover sm:text-lg">
            {it.q}
            <span
              className="faq-plus shrink-0 font-mono text-2xl font-light leading-none text-gold transition-transform"
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <p className="border-t border-line px-6 py-5 leading-relaxed text-soft">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
