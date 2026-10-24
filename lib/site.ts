// Single place to rename the product. Everything user-facing reads from here.
// The wordmark matches the live brand site (leksmedias.com), which writes "Leksmedia".
export const SITE = {
  name: "Leksmedia",
  chip: "Script Research",
  tagline: "Faceless scripts, researched for you.",
  description:
    "Give it a topic. AI reads the live web, cites every source, and writes a retention-built faceless YouTube script in two versions: one with visual cues for your editor, one clean for voiceover.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
