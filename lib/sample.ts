// Abbreviated sample shown on the landing page.
// Every fact below was checked against the cited sources.

export type VisualLine =
  | { kind: "heading"; text: string }
  | { kind: "cue"; text: string }
  | { kind: "line"; text: string };

export const SAMPLE_META = {
  topic: "How Blockbuster lost to Netflix",
  format: "Documentary",
  length: "12 min",
} as const;

export const SAMPLE_VISUAL: VisualLine[] = [
  { kind: "heading", text: "HOOK (0:00-0:30)" },
  { kind: "cue", text: "B-ROLL: Blockbuster storefront at night, blue sign glowing" },
  {
    kind: "line",
    text: "In 2000, the biggest name in video rental had the chance to buy a small DVD-by-mail startup for fifty million dollars.",
  },
  { kind: "cue", text: 'TEXT ON SCREEN: "$50 million"' },
  { kind: "line", text: "Blockbuster said no." },
  { kind: "cue", text: "IMAGE: Early Netflix red envelope on a doormat" },
  {
    kind: "line",
    text: "Ten years later, Blockbuster was bankrupt, and that startup was on its way to changing how the world watches movies.",
  },
  { kind: "cue", text: "B-ROLL: Rows of empty shelves, closing-down signs" },
  {
    kind: "line",
    text: "So how does a company with more than nine thousand stores lose to a website that mailed out discs?",
  },
  { kind: "heading", text: "THE EMPIRE (0:30-3:00)" },
  { kind: "cue", text: "IMAGE: Dallas street, 1985, archival photo" },
  { kind: "cue", text: 'TEXT ON SCREEN: "October 19, 1985"' },
  {
    kind: "line",
    text: "It started in Dallas, Texas, when a man named David Cook opened a single video rental shop.",
  },
  { kind: "cue", text: "B-ROLL: Time-lapse of a store map filling with pins" },
  {
    kind: "line",
    text: "By 2004, that one shop had turned into 9,094 stores and 84,300 employees.",
  },
  { kind: "cue", text: "MUSIC: Drop to quiet, tension builds" },
  {
    kind: "line",
    text: "But the number that matters most is the one from four years earlier. The fifty million dollars Blockbuster walked away from.",
  },
];

export const SAMPLE_CLEAN: string[] = [
  "In 2000, the biggest name in video rental had the chance to buy a small DVD-by-mail startup for fifty million dollars. Blockbuster said no. Ten years later, Blockbuster was bankrupt, and that startup was on its way to changing how the world watches movies. So how does a company with more than nine thousand stores lose to a website that mailed out discs?",
  "It started in Dallas, Texas, on October nineteenth, 1985, when a man named David Cook opened a single video rental shop. By 2004, that one shop had turned into nine thousand and ninety-four stores and eighty-four thousand employees.",
  "But the number that matters most is the one from four years earlier. The fifty million dollars Blockbuster walked away from.",
];

export const SAMPLE_SOURCES = [
  {
    n: 1,
    title: "Blockbuster LLC",
    host: "en.wikipedia.org",
    url: "https://en.wikipedia.org/wiki/Blockbuster_LLC",
  },
  {
    n: 2,
    title: "Netflix",
    host: "en.wikipedia.org",
    url: "https://en.wikipedia.org/wiki/Netflix",
  },
] as const;

export const SAMPLE_CLAIMS = [
  { claim: "Blockbuster turned down a chance to buy Netflix for $50 million in 2000", src: [1] },
  { claim: "Netflix was then a DVD-by-mail business", src: [2] },
  { claim: "Founded by David Cook in 1985, first store in Dallas on October 19", src: [1] },
  { claim: "9,094 stores and 84,300 employees at the 2004 peak", src: [1] },
  { claim: "Chapter 11 bankruptcy filing on September 23, 2010", src: [1] },
] as const;
