"use client";

import { useState } from "react";

type State = "idle" | "loading" | "done" | "error";

export function EarlyAccessForm({ source, id }: { source: string; id: string }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          company: form.get("company"),
          source,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setState("done");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="rounded bg-panel-2 px-5 py-4 text-lg">
        You are on the list. We will email you when early access opens.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto w-full max-w-xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor={`${id}-email`} className="sr-only">
            Email address
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email address"
            className="h-14 w-full rounded border border-line bg-black/60 px-4 text-base text-white placeholder:text-mute"
            aria-describedby={state === "error" ? `${id}-error` : undefined}
          />
          {/* honeypot, hidden from people */}
          <input
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />
        </div>
        <button
          type="submit"
          disabled={state === "loading"}
          className="h-14 rounded bg-brand px-7 text-xl font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {state === "loading" ? "Joining..." : "Get early access"}
        </button>
      </div>
      <p id={`${id}-error`} role="alert" className="mt-3 min-h-5 text-sm text-[#ff6b73]">
        {state === "error" ? message : ""}
      </p>
    </form>
  );
}
