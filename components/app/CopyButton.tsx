"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy", className = "btn btn-ghost px-5 py-2.5 text-[13px]" }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      // Older browsers and some embedded views block the clipboard API: fall back to selecting text.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        setState(document.execCommand("copy") ? "done" : "failed");
      } catch {
        setState("failed");
      }
      ta.remove();
    }
    setTimeout(() => setState("idle"), 2000);
  }
  return (
    <button type="button" onClick={copy} className={className}>
      {state === "done" ? "Copied" : state === "failed" ? "Press Ctrl+C" : label}
    </button>
  );
}
