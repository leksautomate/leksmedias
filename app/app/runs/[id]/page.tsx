import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { runEvents, runs, scripts } from "@/db/schema";
import { ResultView, type Audit } from "@/components/app/ResultView";
import { RunProgress } from "@/components/app/RunProgress";
import { StatusChip } from "@/components/app/StatusChip";
import { FORMATS } from "@/lib/core/rules";
import { num } from "@/lib/format";
import { requireVerifiedUser } from "@/lib/server/dal";

export const metadata: Metadata = { title: "Script" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireVerifiedUser();
  if (!UUID.test(id)) notFound();
  const db = getDb();
  const run = (await db.select().from(runs).where(and(eq(runs.id, id), eq(runs.userId, user.id))).limit(1))[0];
  if (!run) notFound();

  const header = (
    <div className="mb-10">
      <Link href="/app" className="font-mono text-xs text-soft hover:text-white">← All scripts</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <h1 className="h-display max-w-3xl text-3xl sm:text-5xl">{run.topic}</h1>
        <StatusChip status={run.status} />
      </div>
      <p className="mt-4 font-mono text-xs text-mute">
        {FORMATS.find((f) => f.id === run.format)?.label} · {num(run.words)} words · {run.depth === "deep" ? "deep research" : "standard research"} · {num(run.creditsCost)} credits
        {run.demo ? " · demo placeholder" : ""}
      </p>
    </div>
  );

  if (run.status === "queued" || run.status === "running") {
    const events = (await db.select().from(runEvents).where(eq(runEvents.runId, id)).orderBy(desc(runEvents.id)).limit(30)).reverse();
    return (
      <>
        {header}
        <RunProgress
          runId={id}
          initial={{
            status: run.status,
            stage: run.stage,
            progress: run.progress,
            error: run.error,
            depth: run.depth,
            words: run.words,
            events: events.map((e) => ({ id: e.id, at: e.at.toISOString(), kind: e.kind, message: e.message })),
          }}
        />
      </>
    );
  }

  if (run.status === "completed") {
    const rows = await db.select().from(scripts).where(eq(scripts.runId, id)).orderBy(asc(scripts.kind));
    const by = Object.fromEntries(rows.map((r) => [r.kind, r]));
    if (!by.visual || !by.clean) notFound();
    return (
      <>
        {header}
        {run.demo && (
          <p role="note" className="mb-8 rounded-xl border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
            This is demo output. The research and the text are placeholders, not a real script.
          </p>
        )}
        <ResultView runId={id} visual={by.visual.body} clean={by.clean.body} sources={by.sources?.body ?? ""} audit={(by.clean.audit ?? null) as Audit} />
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/app/new" className="btn btn-primary">Write another <span aria-hidden="true">→</span></Link>
          <Link href={`/app/new?topic=${encodeURIComponent(run.topic)}&format=${run.format}&words=${run.words}`} className="btn btn-ghost">Start from this brief</Link>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="card p-8">
        <p className="eyebrow">{run.status === "failed" ? "This script could not be finished" : "Cancelled"}</p>
        <p className="mt-4 max-w-2xl leading-relaxed text-soft">
          {run.status === "failed" ? run.error ?? "Something went wrong on our side." : "You stopped this script."} Your credits were returned{run.status === "cancelled" && run.depth === "deep" ? ", except for deep research that had already started" : ""}.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/app/new?topic=${encodeURIComponent(run.topic)}&format=${run.format}&words=${run.words}`} className="btn btn-primary">Try again</Link>
          <Link href="/app" className="btn btn-ghost">Back to dashboard</Link>
        </div>
      </div>
    </>
  );
}
