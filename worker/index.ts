import os from "node:os";
import { getDb, getPool } from "@/db";
import { purgeExpired } from "@/lib/auth/service";
import { claimNext, recoverStale, releaseRun } from "@/lib/pipeline/queue";
import { runOnce } from "@/lib/pipeline/run";
import { makeProviders } from "@/lib/providers";

// The worker is a separate process from the website so that a 45-minute research run never ties up a web
// request, and a website restart never interrupts a script. Run it with `npm run worker`.

const workerId = `${os.hostname()}-${process.pid}`;
const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 2);
const maxDeep = Number(process.env.MAX_DEEP_CONCURRENT ?? 2);
const log = (message: string, err?: unknown) =>
  console.log(`${new Date().toISOString()} [worker ${workerId}] ${message}`, err instanceof Error ? `\n${err.stack ?? err.message}` : err ?? "");

const db = getDb();
const providers = makeProviders();
const active = new Map<string, Promise<void>>();
let stopping = false;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function start(runId: string) {
  log(`starting run ${runId}`);
  const p = runOnce({ db, llm: providers.llm, web: providers.web, workerId, log }, runId)
    .then((outcome) => log(`run ${runId} ${outcome}`))
    .catch((err) => log(`run ${runId} crashed`, err))
    .finally(() => active.delete(runId));
  active.set(runId, p);
}

async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  log(`${signal} received, finishing ${active.size} active run(s)`);
  await Promise.race([Promise.allSettled([...active.values()]), sleep(25_000)]);
  for (const id of active.keys()) {
    await releaseRun(db, id, workerId);
    log(`released run ${id} back to the queue`);
  }
  await getPool().end();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

async function main() {
  log(`up. providers: llm=${providers.llm.name} web=${providers.web.name}${providers.demo ? " (DEMO MODE)" : ""}, concurrency=${concurrency}, deep=${maxDeep}`);
  let lastMaintenance = 0;
  while (!stopping) {
    try {
      if (Date.now() - lastMaintenance > 30_000) {
        lastMaintenance = Date.now();
        const n = await recoverStale(db);
        if (n) log(`recovered ${n} stalled run(s)`);
        if (Math.random() < 0.05) await purgeExpired(db);
      }
      while (active.size < concurrency && !stopping) {
        const id = await claimNext(db, workerId, maxDeep);
        if (!id) break;
        start(id);
      }
    } catch (err) {
      log("queue loop error", err);
      await sleep(5000);
    }
    await sleep(2000);
  }
}

main().catch((err) => {
  log("fatal", err);
  process.exit(1);
});
