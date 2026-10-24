type Row = { label: string; left: string; right: string };

export function Compare({
  leftTitle,
  rightTitle,
  rows,
}: {
  leftTitle: string;
  rightTitle: string;
  rows: readonly Row[];
}) {
  return (
    <div className="card overflow-hidden">
      <div className="hidden grid-cols-[11rem_1fr_1fr] gap-6 border-b border-line bg-elevated px-6 py-4 font-mono text-[11px] uppercase tracking-[0.14em] md:grid">
        <span />
        <span className="text-mute">{leftTitle}</span>
        <span className="text-gold">{rightTitle}</span>
      </div>
      <ul>
        {rows.map((r) => (
          <li
            key={r.label}
            className="grid gap-3 border-b border-line px-5 py-5 last:border-0 md:grid-cols-[11rem_1fr_1fr] md:gap-6 md:px-6"
          >
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-white">{r.label}</p>
            <p className="flex gap-3 text-sm leading-relaxed text-soft">
              <span aria-hidden="true" className="mt-0.5 shrink-0 font-mono text-bad">
                ✗
              </span>
              <span>
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-mute md:hidden">
                  {leftTitle}
                </span>
                {r.left}
              </span>
            </p>
            <p className="flex gap-3 text-sm leading-relaxed text-ink">
              <span aria-hidden="true" className="mt-0.5 shrink-0 font-mono text-good">
                ✓
              </span>
              <span>
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-gold md:hidden">
                  {rightTitle}
                </span>
                {r.right}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
