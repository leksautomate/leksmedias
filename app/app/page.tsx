import Link from "next/link";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { runs } from "@/db/schema";
import { StatusChip } from "@/components/app/StatusChip";
import { ago, num } from "@/lib/format";
import { FORMATS } from "@/lib/core/rules";
import { requireVerifiedUser } from "@/lib/server/dal";

const EXAMPLES = ["How Blockbuster lost to Netflix", "What happened to Malaysia Airlines Flight 370", "Why the 2008 financial crisis happened"];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireVerifiedUser();
  const sp = await searchParams;
  const db = getDb();
  const list = await db
    .select({ id: runs.id, topic: runs.topic, status: runs.status, words: runs.words, depth: runs.depth, format: runs.format, creditsCost: runs.creditsCost, createdAt: runs.createdAt, demo: runs.demo })
    .from(runs)
    .where(eq(runs.userId, user.id))
    .orderBy(desc(runs.createdAt))
    .limit(30);
  const [{ n: finished }] = await db.select({ n: count() }).from(runs).where(and(eq(runs.userId, user.id), eq(runs.status, "completed")));
  const [{ n: active }] = await db.select({ n: count() }).from(runs).where(and(eq(runs.userId, user.id), inArray(runs.status, ["queued", "running"])));

  return (
    <div className="space-y-12">
      {sp.welcome === "1" && (
        <p role="status" className="rounded-xl border border-good/30 bg-good/10 p-4 text-sm text-good">
          Email confirmed. Your {num(user.creditBalance)} free credits are ready.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="h-display mt-3 text-4xl sm:text-5xl">
            {user.name ? <>Hello, <em>{user.name.split(" ")[0]}.</em></> : <>Your <em>scripts.</em></>}
          </h1>
        </div>
        <Link href="/app/new" className="btn btn-primary">Write a script <span aria-hidden="true">→</span></Link>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="card p-6"><dt className="font-mono text-[11px] uppercase tracking-wider text-mute">Credits</dt><dd className="mt-2 font-serif text-5xl text-white">{num(user.creditBalance)}</dd><dd className="font-mono text-[11px] text-mute">about {Math.floor(user.creditBalance / 150)} standard scripts</dd></div>
        <div className="card p-6"><dt className="font-mono text-[11px] uppercase tracking-wider text-mute">Scripts finished</dt><dd className="mt-2 font-serif text-5xl text-white">{finished}</dd></div>
        <div className="card p-6"><dt className="font-mono text-[11px] uppercase tracking-wider text-mute">In progress</dt><dd className="mt-2 font-serif text-5xl text-white">{active}</dd></div>
      </dl>

      {list.length === 0 ? (
        <section className="card p-8 sm:p-12">
          <p className="eyebrow">Start here</p>
          <h2 className="h-display mt-3 text-3xl sm:text-4xl">Write your first <em>script.</em></h2>
          <p className="mt-4 max-w-xl leading-relaxed text-soft">
            Pick a topic and we research it, check the facts and write both versions. Your free credits cover about {Math.floor(user.creditBalance / 150)} standard scripts. Not sure what to try?
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {EXAMPLES.map((e) => (
              <Link key={e} href={`/app/new?topic=${encodeURIComponent(e)}`} className="btn btn-ghost px-5 py-2.5 text-[13px]">{e}</Link>
            ))}
          </div>
        </section>
      ) : (
        <section aria-label="Your scripts">
          <h2 className="font-serif text-2xl text-white">Recent scripts</h2>
          <ul className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {list.map((r) => (
              <li key={r.id}>
                <Link href={`/app/runs/${r.id}`} className="flex flex-wrap items-center justify-between gap-4 bg-card px-5 py-4 transition-colors hover:bg-hover sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-white">{r.topic}</p>
                    <p className="mt-1 font-mono text-[11px] text-mute">
                      {FORMATS.find((f) => f.id === r.format)?.label} · {num(r.words)} words · {r.depth === "deep" ? "deep research" : "standard research"} · {ago(r.createdAt)}
                      {r.demo ? " · demo" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-mute">{num(r.creditsCost)} credits</span>
                    <StatusChip status={r.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
