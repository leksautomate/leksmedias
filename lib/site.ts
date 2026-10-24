// Single place to rename the product. Everything user-facing reads from here.
export const SITE = {
  name: "ScriptForge",
  tagline: "Faceless scripts, researched for you.",
  description:
    "Give it a topic. AI reads the live web, cites every source, and writes a retention-built faceless YouTube script in two versions: one with visual cues for your editor, one clean for voiceover.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
