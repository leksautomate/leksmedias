"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { cancelRun, createRun } from "@/lib/pipeline/create";
import { isDemoMode } from "@/lib/providers";
import { requireVerifiedUser } from "@/lib/server/dal";

export type BriefState = { error?: string };

function linesToUrls(raw: FormDataEntryValue | null): string[] | undefined {
  if (typeof raw !== "string") return undefined;
  const urls = raw.split(/\s+/).map((s) => s.trim()).filter(Boolean);
  return urls.length ? urls : undefined;
}

export async function createRunAction(_prev: BriefState, form: FormData): Promise<BriefState> {
  const user = await requireVerifiedUser();
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const result = await createRun(
    getDb(),
    user,
    {
      topic: str("topic") ?? "",
      format: str("format") ?? "documentary",
      niche: str("niche"),
      words: Number(form.get("words")),
      depth: form.get("depth") === "deep" ? "deep" : "standard",
      voiceNotes: str("voiceNotes"),
      language: str("language") ?? "en",
      ownSources: linesToUrls(form.get("ownSources")),
    },
    { demo: isDemoMode() },
  );
  if (!result.ok) return { error: result.error };
  redirect(`/app/runs/${result.runId}`);
}

export async function cancelRunAction(runId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireVerifiedUser();
  const r = await cancelRun(getDb(), user.id, runId);
  revalidatePath(`/app/runs/${runId}`);
  revalidatePath("/app");
  return r;
}
