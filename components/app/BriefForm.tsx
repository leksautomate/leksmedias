"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createRunAction, type BriefState } from "@/app/app/actions";
import { MAX_WORDS, MIN_WORDS, planAllows, planFor, runCost, sectionCount } from "@/lib/core/credits";
import { FORMATS } from "@/lib/core/rules";
import { formatDuration, num } from "@/lib/format-client";
import { DEEP_RUN_CREDITS } from "@/lib/pricing";

const PRESETS = [
  { label: "Short video", words: 1200 },
  { label: "Standard video", words: 2500 },
  { label: "Long video", words: 5000 },
  { label: "Feature", words: 8000 },
  { label: "Documentary", words: 10000 },
  { label: "Epic", words: 25000 },
  { label: "Marathon", words: 30000 },
] as const;

const EXAMPLES = [
  "How Blockbuster lost to Netflix",
  "What happened to Malaysia Airlines Flight 370",
  "Why the 2008 financial crisis happened",
];

const initial: BriefState = {};

function Submit({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
      {pending ? "Starting..." : label}
    </button>
  );
}

export function BriefForm({ plan, balance, defaults }: { plan: string; balance: number; defaults?: { topic?: string; format?: string; words?: number } }) {
  const [state, action] = useActionState(createRunAction, initial);
  const [topic, setTopic] = useState(defaults?.topic ?? "");
  const [format, setFormat] = useState(defaults?.format ?? "documentary");
  const [words, setWords] = useState(defaults?.words ?? 2500);
  const [depth, setDepth] = useState<"standard" | "deep">("standard");
  // Controlled so a failed submit does not wipe what was typed (React 19 resets uncontrolled fields).
  const [voiceNotes, setVoiceNotes] = useState("");
  const [ownSources, setOwnSources] = useState("");
  const p = planFor(plan);

  const info = useMemo(() => {
    if (!Number.isFinite(words) || words < MIN_WORDS || words > MAX_WORDS) return { valid: false as const };
    const cost = runCost(words, depth);
    return { valid: true as const, cost, allowed: planAllows(plan, words, depth), sections: sectionCount(words) };
  }, [words, depth, plan]);

  const short = info.valid && info.cost.total > balance;
  const blocked = !info.valid || !info.allowed.ok || short || topic.trim().length < 10;

  return (
    <form action={action} className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-10">
        <section>
          <label htmlFor="topic" className="eyebrow">1. Topic</label>
          <textarea
            id="topic"
            name="topic"
            required
            minLength={10}
            maxLength={500}
            rows={3}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What is the video about? A title or a sentence is enough."
            className="mt-3 w-full rounded-xl border border-line-strong bg-card p-4 text-base text-ink placeholder:text-mute focus:border-gold"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-mute">Try:</span>
            {EXAMPLES.map((e) => (
              <button key={e} type="button" onClick={() => setTopic(e)} className="rounded-full border border-line px-3 py-1 text-xs text-soft transition-colors hover:border-line-strong hover:text-white">
                {e}
              </button>
            ))}
          </div>
        </section>

        <fieldset>
          <legend className="eyebrow">2. Format</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {FORMATS.map((f) => (
              <label key={f.id} className={`card cursor-pointer p-4 transition-colors ${format === f.id ? "border-gold bg-gold-soft" : "hover:border-line-strong"}`}>
                <input type="radio" name="format" value={f.id} checked={format === f.id} onChange={() => setFormat(f.id)} className="sr-only" />
                <span className="block font-serif text-xl text-white">{f.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-soft">{f.blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="eyebrow">3. Length</legend>
          <input type="hidden" name="words" value={words} />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESETS.map((pr) => {
              const locked = pr.words > p.maxWords;
              return (
                <button
                  key={pr.words}
                  type="button"
                  onClick={() => setWords(pr.words)}
                  aria-pressed={words === pr.words}
                  className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                    words === pr.words ? "border-gold bg-gold-soft" : "border-line hover:border-line-strong"
                  } ${locked ? "opacity-50" : ""}`}
                >
                  <span className="block text-sm text-white">{pr.label}</span>
                  <span className="block font-mono text-[11px] text-mute">
                    {num(pr.words)} words{locked ? " · higher plan" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label htmlFor="words-custom" className="text-sm text-soft">Or exactly</label>
            <input
              id="words-custom"
              type="number"
              min={MIN_WORDS}
              max={MAX_WORDS}
              step={100}
              value={Number.isFinite(words) ? words : ""}
              onChange={(e) => setWords(Number(e.target.value))}
              className="h-10 w-28 rounded-lg border border-line-strong bg-card px-3 font-mono text-sm text-ink focus:border-gold"
            />
            <span className="text-sm text-soft">words{info.valid ? `, about ${formatDuration(words)} of narration` : ""}</span>
          </div>
        </fieldset>

        <fieldset>
          <legend className="eyebrow">4. Research depth</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className={`card cursor-pointer p-4 transition-colors ${depth === "standard" ? "border-gold bg-gold-soft" : "hover:border-line-strong"}`}>
              <input type="radio" name="depth" value="standard" checked={depth === "standard"} onChange={() => setDepth("standard")} className="sr-only" />
              <span className="block font-serif text-xl text-white">Standard</span>
              <span className="mt-1 block text-xs leading-relaxed text-soft">Searches the web, reads the strongest pages and cites them. Included in the script price.</span>
            </label>
            <label className={`card p-4 transition-colors ${p.deepResearch ? "cursor-pointer" : "opacity-60"} ${depth === "deep" ? "border-gold bg-gold-soft" : p.deepResearch ? "hover:border-line-strong" : ""}`}>
              <input type="radio" name="depth" value="deep" disabled={!p.deepResearch} checked={depth === "deep"} onChange={() => setDepth("deep")} className="sr-only" />
              <span className="block font-serif text-xl text-white">Deep</span>
              <span className="mt-1 block text-xs leading-relaxed text-soft">
                TinyFish&apos;s research agent works for 5 to 20 minutes across far more sources. {DEEP_RUN_CREDITS} credits per run.
                {!p.deepResearch && <span className="mt-1 block text-gold">Available from the Creator plan.</span>}
              </span>
            </label>
          </div>
        </fieldset>

        <details className="card p-5">
          <summary className="cursor-pointer text-sm text-white">Optional: your channel&apos;s voice and your own sources</summary>
          <div className="mt-5 space-y-5">
            <div>
              <label htmlFor="voiceNotes" className="mb-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-soft">Voice notes</label>
              <textarea id="voiceNotes" name="voiceNotes" rows={3} maxLength={1000} value={voiceNotes} onChange={(e) => setVoiceNotes(e.target.value)} placeholder="For example: dry humour, short punchy openers, speaks to the viewer as 'you'." className="w-full rounded-xl border border-line-strong bg-bg p-3 text-sm text-ink placeholder:text-mute focus:border-gold" />
            </div>
            <div>
              <label htmlFor="ownSources" className="mb-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-soft">Your own sources {["pro", "studio"].includes(plan) ? "" : "(Pro and above)"}</label>
              <textarea id="ownSources" name="ownSources" rows={3} value={ownSources} onChange={(e) => setOwnSources(e.target.value)} disabled={!["pro", "studio"].includes(plan)} placeholder="One link per line. We read these first." className="w-full rounded-xl border border-line-strong bg-bg p-3 font-mono text-xs text-ink placeholder:text-mute focus:border-gold disabled:opacity-50" />
            </div>
          </div>
        </details>
      </div>

      <aside className="lg:sticky lg:top-40 lg:self-start">
        <div className="card p-6" aria-live="polite">
          <p className="eyebrow">Cost</p>
          {info.valid ? (
            <>
              <p className="mt-3 font-serif text-5xl text-white">{num(info.cost.total)}</p>
              <p className="font-mono text-xs text-mute">credits</p>
              <dl className="mt-5 space-y-2 border-t border-line pt-4 font-mono text-xs">
                <div className="flex justify-between gap-4"><dt className="text-soft">{num(words)}-word script</dt><dd className="text-white">{num(info.cost.scriptCredits)}</dd></div>
                {depth === "deep" && (
                  <div className="flex justify-between gap-4"><dt className="text-soft">Deep research, {info.cost.deepRuns} run{info.cost.deepRuns === 1 ? "" : "s"}</dt><dd className="text-white">{num(info.cost.deepCredits)}</dd></div>
                )}
                <div className="flex justify-between gap-4"><dt className="text-soft">Your balance</dt><dd className={short ? "text-bad" : "text-white"}>{num(balance)}</dd></div>
                {!short && <div className="flex justify-between gap-4"><dt className="text-soft">After this script</dt><dd className="text-white">{num(balance - info.cost.total)}</dd></div>}
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-mute">
                Written in {info.sections} section{info.sections === 1 ? "" : "s"}. Both versions are included. If it fails, the credits come back.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-soft">Choose a length between {num(MIN_WORDS)} and {num(MAX_WORDS)} words.</p>
          )}
          {info.valid && !info.allowed.ok && (
            <p role="alert" className="mt-4 rounded-lg border border-gold/30 bg-gold-soft p-3 text-sm text-soft">
              {info.allowed.reason}{" "}
              <Link href="/pricing" className="text-gold underline underline-offset-4">See plans</Link>
            </p>
          )}
          {short && (
            <p role="alert" className="mt-4 rounded-lg border border-bad/30 bg-bad/10 p-3 text-sm text-soft">
              You need {num(info.valid ? info.cost.total - balance : 0)} more credits. Try a shorter script{depth === "deep" ? " or standard research" : ""}.
            </p>
          )}
          {state.error && <p role="alert" className="mt-4 rounded-lg border border-bad/30 bg-bad/10 p-3 text-sm text-bad">{state.error}</p>}
          <div className="mt-6">
            <Submit label={info.valid ? `Write script (${num(info.cost.total)} credits)` : "Write script"} disabled={blocked} />
          </div>
        </div>
      </aside>
    </form>
  );
}
