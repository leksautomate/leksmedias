const FORMATS = [
  { name: "Documentary", hook: "Rapid-fire controversy list, then the turn", length: "12 to 60 min" },
  { name: "Listicle", hook: "Most extreme example first, then the promise", length: "6 to 20 min" },
  { name: "Exposé", hook: "Build the trust, then break it", length: "15 to 20 min" },
  { name: "True crime", hook: "Cold open on the most dramatic moment", length: "15 to 25 min" },
  { name: "Video essay", hook: "A thesis the comments will argue about", length: "10 to 25 min" },
  { name: "Explainer", hook: "Show the result first, then how", length: "8 to 15 min" },
] as const;

export function FormatRow() {
  return (
    <ul className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8" aria-label="Script formats">
      {FORMATS.map((f, i) => (
        <li
          key={f.name}
          className="relative h-72 w-52 shrink-0 snap-start overflow-hidden rounded-md border border-panel-4 bg-gradient-to-br from-panel-3 via-panel to-black p-5"
        >
          <span
            aria-hidden="true"
            className="absolute -bottom-6 -left-1 select-none text-[9rem] font-bold leading-none text-transparent"
            style={{ WebkitTextStroke: "3px rgb(255 255 255 / 0.18)" }}
          >
            {i + 1}
          </span>
          <div className="relative flex h-full flex-col justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">{f.length}</p>
            <div>
              <h3 className="text-2xl font-bold">{f.name}</h3>
              <p className="mt-2 text-sm text-soft">{f.hook}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
