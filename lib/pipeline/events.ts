import { runEvents } from "@/db/schema";
import type { Db } from "@/db";

export type EventKind = "info" | "stage" | "search" | "read" | "warn" | "error";

/** Writes a line to the run's live feed. The run page shows these as they happen. */
export async function emit(db: Db, runId: string, kind: EventKind, message: string, data?: unknown) {
  await db.insert(runEvents).values({ runId, kind, message: message.slice(0, 500), data: data ?? null });
}
