"use client";

import { useState } from "react";
import { CopyButton } from "@/components/app/CopyButton";
import { num } from "@/lib/format-client";

export type Audit = {
  wordCount: number;
  targetWords: number;
  duration: string;
  fixes: string[];
  issues: { rule: string; severity: string; message: string; snippet?: string }[];
  factsUsed: number;
  factsTotal: number;
  unsourced: string[];
  invalidTags: number[];
  rewrittenSections: number;
  shortBy: number;
} | null;

const HEADING = /^.+ \(\d+:\d\d(?::\d\d)?-\d+:\d\d(?::\d\d)?\)$/;

function VisualScript({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {blocks.map((b, i) =>
        HEADING.test(b.trim()) ? (
          <p key={i} className="pt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-gold first:pt-0">{b}</p>
        ) : b.startsWith("[") ? (
          <p key={i} className="font-mono text-[13px] text-gold/80">{b}</p>
        ) : (
          <p key={i} className="text-ink">{b}</p>
        ),
      )}
    </div>
  );
}

const TABS = [
  { id: "visual", label: "With visuals", hint: "For your editor" },
  { id: "clean", label: "Clean + sources", hint: "For voiceover and fact-checking" },
] as const;

export function ResultView({ runId, visual, clean, sources, audit }: { runId: string; visual: string; clean: string; sources: string; audit: Audit }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("visual");
  const dl = (kind: string) => `/api/runs/${runId}/download?kind=${kind}`;
  const problems = (audit?.issues ?? []).filter((i) => i.severity !== "fixed");

  return (
    <div className="space-y-8">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-elevated p-3">
          <div role="tablist" aria-label="Script versions" className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-4 py-2.5 text-left font-mono text-xs transition-colors ${tab === t.id ? "bg-gold text-bg" : "text-soft hover:bg-hover hover:text-white"}`}
              >
                <span className="block font-semibold">{t.label}</span>
                <span className={`hidden text-[10px] sm:block ${tab === t.id ? "text-bg/70" : "text-mute"}`}>{t.hint}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={tab === "visual" ? visual : clean} label={tab === "visual" ? "Copy script" : "Copy narration"} />
            <a href={dl(tab === "visual" ? "visual" : "clean")} className="btn btn-ghost px-5 py-2.5 text-[13px]">Download .txt</a>
          </div>
        </div>

        <div role="tabpanel" tabIndex={0} className="max-h-[42rem] overflow-y-auto p-5 sm:p-8">
          {tab === "visual" ? (
            <VisualScript text={visual} />
          ) : (
            <div className="space-y-4 text-[15px] leading-relaxed text-ink">
              {clean.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {tab === "clean" && (
        <section className="card overflow-hidden" aria-label="Sources and fact check">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-elevated p-4">
            <p className="eyebrow">// Sources and fact check</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={sources} label="Copy sources" />
              <a href={dl("sources")} className="btn btn-ghost px-5 py-2.5 text-[13px]">Download .txt</a>
            </div>
          </div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-5 font-mono text-[13px] leading-relaxed text-soft sm:p-8">{sources}</pre>
        </section>
      )}

      {audit && (
        <section className="card p-6 sm:p-8" aria-label="Audit">
          <p className="eyebrow">Audit</p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-4">
            <div><dt className="font-mono text-[11px] uppercase tracking-wider text-mute">Words</dt><dd className="mt-1 font-serif text-3xl text-white">{num(audit.wordCount)}</dd><dd className="font-mono text-[11px] text-mute">of {num(audit.targetWords)} asked</dd></div>
            <div><dt className="font-mono text-[11px] uppercase tracking-wider text-mute">Narration</dt><dd className="mt-1 font-serif text-3xl text-white">{audit.duration}</dd></div>
            <div><dt className="font-mono text-[11px] uppercase tracking-wider text-mute">Facts used</dt><dd className="mt-1 font-serif text-3xl text-white">{audit.factsUsed}</dd><dd className="font-mono text-[11px] text-mute">of {audit.factsTotal} researched</dd></div>
            <div><dt className="font-mono text-[11px] uppercase tracking-wider text-mute">Sections rewritten</dt><dd className="mt-1 font-serif text-3xl text-white">{audit.rewrittenSections}</dd></div>
          </dl>

          {audit.shortBy > 0 && (
            <p className="mt-6 rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
              This script is about {num(audit.shortBy)} words shorter than you asked for, because the research did not support more without guessing. Try deep research for more material.
            </p>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-good">Fixed automatically</p>
              <ul className="mt-3 space-y-2 text-sm text-soft">
                {audit.fixes.length ? audit.fixes.map((f) => <li key={f}>✓ {f}</li>) : <li>Nothing needed fixing.</li>}
              </ul>
            </div>
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-warn">Check before you publish</p>
              <ul className="mt-3 space-y-2 text-sm text-soft">
                {problems.map((p, i) => <li key={i}>• {p.message}{p.snippet ? ` “${p.snippet}”` : ""}</li>)}
                {audit.unsourced.map((u) => <li key={u}>• No source attached: “{u}”</li>)}
                {audit.invalidTags.length > 0 && <li>• The writer cited facts that do not exist ({audit.invalidTags.join(", ")}).</li>}
                {problems.length === 0 && audit.unsourced.length === 0 && audit.invalidTags.length === 0 && <li>No open issues. Still skim the sources before you publish.</li>}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
