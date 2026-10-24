import type { Metadata } from "next";
import { BriefForm } from "@/components/app/BriefForm";
import { requireVerifiedUser } from "@/lib/server/dal";

export const metadata: Metadata = { title: "New script" };

export default async function NewScript({ searchParams }: { searchParams: Promise<{ topic?: string; format?: string; words?: string }> }) {
  const user = await requireVerifiedUser();
  const sp = await searchParams;
  const words = Number(sp.words);
  return (
    <div>
      <p className="eyebrow">New script</p>
      <h1 className="h-display mt-3 text-4xl sm:text-5xl">What is the video <em>about?</em></h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-soft">We research it, check the facts and write both versions. You see the cost before anything is spent.</p>
      <div className="mt-12">
        <BriefForm
          plan={user.plan}
          balance={user.creditBalance}
          defaults={{ topic: sp.topic?.slice(0, 500), format: sp.format, words: Number.isFinite(words) && words >= 300 && words <= 30000 ? words : undefined }}
        />
      </div>
    </div>
  );
}
