"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cancelRunAction } from "@/app/app/actions";

export type Ev = { id: number; at: string; kind: string; message: string };
export type Snap = {
  status: string;
  stage: string;
  progress: { done: number; total: number } | null;
  error: string | null;
  depth: string;
  words: number;
  events: Ev[];
};

const STAGES = [
  { id: "research", label: "Research" },
  { id: "facts", label: "Fact check" },
  { id: "outline", label: "Outline" },
  { id: "writing", label: "Writing" },
  { id: "audit", label: "Audit" },
] as const;

const KIND_STYLE: Record<string, string> = {
  stage: "text-gold",
  search: "text-soft",
  read: "text-soft",
  info: "text-ink",
  warn: "text-warn",
  error: "text-bad",
};

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour12: false });
const TERMINAL = new Set(["completed", "failed", "cancelled"]);

export function RunProgress({ runId, initial }: { runId: string; initial: Snap }) {
  const router = useRouter();
  const [snap, setSnap] = useState<Snap>(initial);
  const [events, setEvents] = useState<Ev[]>(initial.events);
  const [offline, setOffline] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const lastId = useRef(initial.events.at(-1)?.id ?? 0);
  const startedAt = useRef(Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      try {
        const res = await fetch(`/api/runs/${runId}?after=${lastId.current}`, { cache: "no-store" });
        if (res.status === 401) return router.replace("/login");
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as Snap & { events: Ev[] };
        if (stop) return;
        setOffline(false);
        if (j.events.length) {
          lastId.current = j.events.at(-1)!.id;
          setEvents((prev) => [...prev, ...j.events].slice(-60));
        }
        setSnap((s) => ({ ...s, ...j, events: [] }));
        if (TERMINAL.has(j.status)) {
          router.refresh();
          return;
        }
      } catch {
        if (!stop) setOffline(true);
      }
      if (!stop) timer = setTimeout(tick, document.hidden ? 6000 : 2000);
    }
    timer = setTimeout(tick, 1200);
    const clockTimer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stop = true;
      clearTimeout(timer);
      clearInterval(clockTimer);
    };
  }, [runId, router]);

  const current = STAGES.findIndex((s) => s.id === snap.stage);
  const secs = Math.floor((now - startedAt.current) / 1000);
  const queued = snap.status === "queued";
  const pct = snap.progress && snap.progress.total ? Math.round((snap.progress.done / snap.progress.total) * 100) : 0;

  function cancel() {
    start(async () => {
      const r = await cancelRunAction(runId);
      if (!r.ok) setCancelError(r.error ?? "Could not cancel.");
      setConfirming(false);
    });
  }

  return (
    <div className="space-y-8">
      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow">{queued ? "Waiting for a free writer" : "In progress"}</p>
          <p className="font-mono text-xs text-mute" aria-hidden="true">
            {Math.floor(secs / 60)}m {String(secs % 60).padStart(2, "0")}s on this page
          </p>
        </div>

        <ol className="mt-6 grid gap-3 sm:grid-cols-5" aria-label="Progress">
          {STAGES.map((s, i) => {
            const done = i < current || snap.status === "completed";
            const active = i === current && !queued;
            return (
              <li key={s.id} aria-current={active ? "step" : undefined} className={`rounded-xl border p-4 ${active ? "border-gold bg-gold-soft" : done ? "border-good/30" : "border-line"}`}>
                <span className={`font-mono text-[10px] uppercase tracking-wider ${done ? "text-good" : active ? "text-gold" : "text-mute"}`}>
                  {done ? "Done" : active ? "Now" : "Next"}
                </span>
                <span className="mt-1 block text-sm text-white">{s.label}</span>
                {s.id === "writing" && active && snap.progress && (
                  <span className="mt-2 block font-mono text-[11px] text-soft">
                    Section {Math.min(snap.progress.done + 1, snap.progress.total)} of {snap.progress.total}
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {snap.stage === "writing" && snap.progress && (
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Writing progress">
            <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}

        <p className="mt-6 text-sm leading-relaxed text-soft">
          {snap.depth === "deep"
            ? "Deep research usually takes 5 to 20 minutes per research run, and long scripts use several. You can close this page. We keep working and your script will be here when you come back."
            : "Standard research and writing usually take a few minutes, longer for long scripts. You can close this page. We keep working and your script will be here when you come back."}
        </p>
        {offline && <p role="status" className="mt-3 text-sm text-warn">Connection lost. Retrying... Your script is still being written.</p>}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Live feed</div>
        <ol className="max-h-80 space-y-1.5 overflow-y-auto p-5 font-mono text-[13px]" aria-live="polite" aria-label="What is happening now">
          {events.length === 0 && <li className="text-mute">Starting...</li>}
          {events.slice(-14).map((e) => (
            <li key={e.id} className="flex gap-3">
              <span className="shrink-0 text-mute">{clock(e.at)}</span>
              <span className={KIND_STYLE[e.kind] ?? "text-soft"}>{e.message}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className="btn btn-ghost px-5 py-2.5 text-[13px]">
            Cancel this script
          </button>
        ) : (
          <div role="alertdialog" aria-label="Confirm cancel" className="flex flex-wrap items-center gap-3 rounded-xl border border-line-strong p-3">
            <span className="text-sm text-soft">
              Stop and return your credits?{snap.depth === "deep" ? " Deep research that already started cannot be refunded." : ""}
            </span>
            <button type="button" disabled={pending} onClick={cancel} className="btn btn-primary px-5 py-2 text-[13px]">
              {pending ? "Stopping..." : "Yes, stop"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-sm text-soft underline underline-offset-4 hover:text-white">
              Keep going
            </button>
          </div>
        )}
        {cancelError && <p role="alert" className="text-sm text-bad">{cancelError}</p>}
      </div>
    </div>
  );
}
