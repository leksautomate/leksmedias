// Pure helpers safe to import from client components.
export const num = (n: number) => n.toLocaleString("en-US");

export function formatDuration(words: number, wpm = 150): string {
  const total = Math.round((words / wpm) * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
