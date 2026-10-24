const FORMATS = [
  { name: "Documentary", tag: "In media res + the turn", hook: "A rapid-fire list of controversies, then the \"however\" that opens the story.", length: "12 to 60 min" },
  { name: "Listicle", tag: "Extreme example first", hook: "Lead with the wildest item, then promise ten more.", length: "6 to 20 min" },
  { name: "Exposé", tag: "Build trust, then break it", hook: "Make viewers believe in the subject, then flip it.", length: "15 to 20 min" },
  { name: "True crime", tag: "Cold open + stacked mystery", hook: "Start at the most dramatic moment and end on what nobody knows.", length: "15 to 25 min" },
  { name: "Video essay", tag: "Thesis the comments argue about", hook: "A claim strong enough to disagree with.", length: "10 to 25 min" },
  { name: "Explainer", tag: "Result first, then how", hook: "Show the outcome in the first sentence and earn the rest.", length: "8 to 15 min" },
] as const;

export function FormatRow() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Script formats">
      {FORMATS.map((f) => (
        <li key={f.name} className="card p-6 transition-colors hover:border-line-strong">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">{f.tag}</p>
          <h3 className="mt-3 font-serif text-3xl text-white">{f.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-soft">{f.hook}</p>
          <p className="mt-5 border-t border-line pt-4 font-mono text-[11px] text-mute">{f.length}</p>
        </li>
      ))}
    </ul>
  );
}
