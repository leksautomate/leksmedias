import { and, asc, desc, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { runEvents, runs } from "@/db/schema";
import { getCurrentUser } from "@/lib/server/dal";

// Polled by the run page every couple of seconds. Only the owner can read a run.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = getDb();
  const run = (await db.select().from(runs).where(and(eq(runs.id, id), eq(runs.userId, user.id))).limit(1))[0];
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const afterRaw = new URL(req.url).searchParams.get("after");
  const after = afterRaw && /^\d+$/.test(afterRaw) ? Number(afterRaw) : null;
  const events =
    after === null
      ? (await db.select().from(runEvents).where(eq(runEvents.runId, id)).orderBy(desc(runEvents.id)).limit(30)).reverse()
      : await db.select().from(runEvents).where(and(eq(runEvents.runId, id), gt(runEvents.id, after))).orderBy(asc(runEvents.id)).limit(200);

  return NextResponse.json(
    {
      id: run.id,
      status: run.status,
      stage: run.stage,
      progress: run.progress,
      error: run.error,
      depth: run.depth,
      words: run.words,
      events: events.map((e) => ({ id: e.id, at: e.at, kind: e.kind, message: e.message })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
