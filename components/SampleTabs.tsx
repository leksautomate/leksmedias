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
    <div className="overflow-hidden rounded-lg border border-panel-4 bg-black shadow-2xl shadow-black/60">
      <div className="flex items-center gap-2 border-b border-panel-4 bg-panel px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden="true" />
        <p className="ml-3 truncate text-xs text-mute">
          {SAMPLE_META.topic} · {SAMPLE_META.format} · {SAMPLE_META.length}
        </p>
      </div>

      <div role="tablist" aria-label="Script versions" className="flex border-b border-panel-4 bg-panel">
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
              className={`flex-1 border-b-2 px-4 py-3 text-left transition-colors sm:flex-none sm:px-6 ${
                active ? "border-brand text-white" : "border-transparent text-mute hover:text-white"
              }`}
            >
              <span className="block text-sm font-bold">{t.label}</span>
              <span className="hidden text-xs sm:block">{t.hint}</span>
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
                <p key={i} className="pt-3 text-xs font-bold uppercase tracking-widest text-brand first:pt-0">
                  {l.text}
                </p>
              ) : l.kind === "cue" ? (
                <p key={i} className="font-mono text-[13px] text-[#7fb5ff]">
                  [{l.text}]
                </p>
              ) : (
                <p key={i} className="text-white">
                  {l.text}
                </p>
              ),
            )}
          </div>
        ) : (
          <div>
            <div className="space-y-4">
              {SAMPLE_CLEAN.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="mt-8 border-t border-panel-4 pt-6">
              <p className="text-xs font-bold uppercase tracking-widest text-brand">Sources and fact check</p>
              <ul className="mt-4 space-y-3 text-sm">
                {SAMPLE_CLAIMS.map((c) => (
                  <li key={c.claim} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 rounded bg-panel-3 px-1.5 text-xs font-bold text-[#7fe39b]">
                      Verified
                    </span>
                    <span className="text-soft">
                      {c.claim}{" "}
                      <span className="text-mute">{c.src.map((n) => `[${n}]`).join(" ")}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <ol className="mt-5 space-y-1 text-sm text-mute">
                {SAMPLE_SOURCES.map((s) => (
                  <li key={s.n}>
                    [{s.n}]{" "}
                    <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-soft underline">
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
