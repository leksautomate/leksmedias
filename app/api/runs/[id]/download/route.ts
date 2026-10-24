import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { runs, scripts } from "@/db/schema";
import { slugify } from "@/lib/format";
import { getCurrentUser } from "@/lib/server/dal";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = ["visual", "clean", "sources"] as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kind = new URL(req.url).searchParams.get("kind") ?? "";
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Not signed in", { status: 401 });
  if (!UUID.test(id) || !(KINDS as readonly string[]).includes(kind)) return new NextResponse("Not found", { status: 404 });

  const db = getDb();
  const run = (await db.select({ topic: runs.topic, status: runs.status }).from(runs).where(and(eq(runs.id, id), eq(runs.userId, user.id))).limit(1))[0];
  if (!run || run.status !== "completed") return new NextResponse("Not found", { status: 404 });
  const script = (await db.select().from(scripts).where(and(eq(scripts.runId, id), eq(scripts.kind, kind))).limit(1))[0];
  if (!script) return new NextResponse("Not found", { status: 404 });

  const label = { visual: "with-visuals", clean: "clean", sources: "sources" }[kind as (typeof KINDS)[number]];
  return new NextResponse(script.body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(run.topic)}-${label}.txt"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
