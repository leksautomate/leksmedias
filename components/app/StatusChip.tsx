const STYLES: Record<string, string> = {
  queued: "border-line-strong text-soft",
  running: "border-gold/50 bg-gold-soft text-gold",
  completed: "border-good/40 bg-good/10 text-good",
  failed: "border-bad/40 bg-bad/10 text-bad",
  cancelled: "border-line-strong text-mute",
};
const LABELS: Record<string, string> = {
  queued: "Waiting",
  running: "Writing",
  completed: "Ready",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${STYLES[status] ?? STYLES.queued}`}>
      {status === "running" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" aria-hidden="true" />}
      {LABELS[status] ?? status}
    </span>
  );
}
