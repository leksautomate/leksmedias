"use client";

import { useId, useState } from "react";
import { SAMPLE_CLAIMS, SAMPLE_CLEAN, SAMPLE_META, SAMPLE_SOURCES, SAMPLE_VISUAL } from "@/lib/sample";

const TABS = [
  { id: "visual", label: "With visuals", hint: "For your editor" },
  { id: "clean", label: "Clean + sources", hint: "For voiceover and fact-checking" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SampleTabs() {
  const [tab, setTab] = useState<TabId>("visual");
  const uid = useId();

  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = (i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    setTab(TABS[next].id);
    document.getElementById(`${uid}-tab-${TABS[next].id}`)?.focus();
  }

  return (
    <div className="card overflow-hidden shadow-2xl shadow-black/60">
      <div className="border-b border-line px-5 pb-4 pt-5 sm:px-7">
        <p className="eyebrow">Niche: {SAMPLE_META.format}</p>
        <p className="mt-2 font-serif text-2xl leading-tight text-white">{SAMPLE_META.topic}</p>
        <p className="mt-1 font-mono text-[11px] text-mute">{SAMPLE_META.length} · Sample output</p>
      </div>

      <div role="tablist" aria-label="Script versions" className="flex gap-2 border-b border-line bg-elevated p-3">
        {TABS.map((t, i) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              id={`${uid}-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`${uid}-panel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-left font-mono text-xs transition-colors sm:flex-none sm:px-5 ${
                active ? "bg-gold text-bg" : "text-soft hover:bg-hover hover:text-white"
              }`}
            >
              <span className="block font-semibold">{t.label}</span>
              <span className={`hidden text-[10px] sm:block ${active ? "text-bg/70" : "text-mute"}`}>{t.hint}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${uid}-panel-${tab}`}
        aria-labelledby={`${uid}-tab-${tab}`}
        tabIndex={0}
        className="max-h-[34rem] overflow-y-auto p-5 text-[15px] leading-relaxed sm:p-7"
      >
        {tab === "visual" ? (
          <div className="space-y-2.5">
            {SAMPLE_VISUAL.map((l, i) =>
              l.kind === "heading" ? (
                <p key={i} className="pt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-gold first:pt-0">
                  {l.text}
                </p>
              ) : l.kind === "cue" ? (
                <p key={i} className="font-mono text-[13px] text-gold/80">
                  [{l.text}]
                </p>
              ) : (
                <p key={i} className="text-ink">
                  {l.text}
                </p>
              ),
            )}
          </div>
        ) : (
          <div>
            <div className="space-y-4 text-ink">
              {SAMPLE_CLEAN.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-line bg-elevated p-5">
              <p className="eyebrow">// Sources and fact check</p>
              <ul className="mt-4 space-y-3 text-sm">
                {SAMPLE_CLAIMS.map((c) => (
                  <li key={c.claim} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 rounded border border-good/30 bg-good/10 px-1.5 font-mono text-[10px] font-semibold uppercase text-good">
                      Verified
                    </span>
                    <span className="text-soft">
                      {c.claim}{" "}
                      <span className="font-mono text-xs text-mute">{c.src.map((n) => `[${n}]`).join(" ")}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <ol className="mt-5 space-y-1 border-t border-line pt-4 font-mono text-xs text-mute">
                {SAMPLE_SOURCES.map((s) => (
                  <li key={s.n}>
                    [{s.n}]{" "}
                    <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-soft underline hover:text-gold">
                      {s.title}
                    </a>{" "}
                    ({s.host})
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
