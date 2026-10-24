export function Faq({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <div className="mx-auto max-w-3xl space-y-2">
      {items.map((it) => (
        <details key={it.q} className="group bg-panel-2">
          <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-lg font-medium hover:bg-panel-4 sm:text-2xl">
            {it.q}
            <span
              className="faq-plus shrink-0 text-4xl font-light leading-none transition-transform"
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <p className="border-t-8 border-ink px-6 py-5 text-lg leading-relaxed text-soft sm:text-xl">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
