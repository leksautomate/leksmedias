// Plan numbers are sized from real provider prices. See docs/COSTS.md and docs/cost-model.py.
export type PlanId = "free" | "creator" | "pro" | "studio";

export type Feature = { text: string; soon?: boolean };

export type Plan = {
  id: PlanId;
  name: string;
  blurb: string;
  /** Price in USD when billed monthly. */
  monthly: number;
  /** Credits granted per period. One credit = up to WORDS_PER_CREDIT words of script. */
  credits: number;
  /** Deep research runs per period. Each run is one TinyFish Research run. */
  deepRuns: number;
  /** Longest single script, in words. */
  maxWords: number;
  /** Free plan credits are granted once, paid plans renew monthly. */
  oneTime?: boolean;
  featured?: boolean;
  cta: string;
  features: Feature[];
};

export const WORDS_PER_CREDIT = 2500;
/** Yearly billing = pay for 10 months, get 12. */
export const YEARLY_MONTHS_CHARGED = 10;

export const yearlyTotal = (p: Plan) => p.monthly * YEARLY_MONTHS_CHARGED;
export const yearlyPerMonth = (p: Plan) => Math.round(yearlyTotal(p) / 12);

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free trial",
    blurb: "See a full researched script before you pay.",
    monthly: 0,
    credits: 2,
    deepRuns: 0,
    maxWords: 2500,
    oneTime: true,
    cta: "Try it free",
    features: [
      { text: "2 credits, one time" },
      { text: "Standard research with cited sources" },
      { text: "Both script versions" },
      { text: "Scripts up to 2,500 words" },
      { text: "Copy to clipboard" },
    ],
  },
  {
    id: "creator",
    name: "Creator",
    blurb: "For one channel posting every week.",
    monthly: 29,
    credits: 15,
    deepRuns: 2,
    maxWords: 5000,
    cta: "Get early access",
    features: [
      { text: "15 credits a month, about 37,000 words" },
      { text: "2 deep research runs a month" },
      { text: "All 6 script formats" },
      { text: "Both versions, with sources" },
      { text: "Automatic AI-pattern audit" },
      { text: "Scripts up to 5,000 words" },
      { text: "1 channel voice profile" },
      { text: "Export to TXT and Markdown" },
      { text: "Use from Claude Code, Codex and more", soon: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "For channels that publish several times a week.",
    monthly: 79,
    credits: 50,
    deepRuns: 8,
    maxWords: 12500,
    featured: true,
    cta: "Get early access",
    features: [
      { text: "50 credits a month, about 125,000 words" },
      { text: "8 deep research runs a month" },
      { text: "Everything in Creator" },
      { text: "Scripts up to 12,500 words, written section by section" },
      { text: "Add your own sources and links" },
      { text: "5 channel voice profiles" },
      { text: "Priority research queue" },
      { text: "Export to DOCX" },
      { text: "Competitor transcript analysis", soon: true },
    ],
  },
  {
    id: "studio",
    name: "Studio",
    blurb: "For agencies and multi-channel operators.",
    monthly: 199,
    credits: 150,
    deepRuns: 20,
    maxWords: 30000,
    cta: "Get early access",
    features: [
      { text: "150 credits a month, about 375,000 words" },
      { text: "20 deep research runs a month" },
      { text: "Everything in Pro" },
      { text: "Scripts up to 30,000 words, for 2 hour plus documentaries" },
      { text: "Unlimited channel voice profiles" },
      { text: "Batch queue, 10 scripts at once" },
      { text: "3 team seats" },
      { text: "Priority support" },
      { text: "API access", soon: true },
    ],
  },
];

/** Credits and deep runs for common script sizes. Narration time assumes 150 words a minute. */
export const CREDIT_RULES = [
  { words: 2500, time: "about 17 min", credits: 1, deepRuns: 1 },
  { words: 5000, time: "about 33 min", credits: 2, deepRuns: 1 },
  { words: 10000, time: "about 1 hr 7 min", credits: 4, deepRuns: 2 },
  { words: 25000, time: "about 2 hr 47 min", credits: 10, deepRuns: 4 },
  { words: 30000, time: "about 3 hr 20 min", credits: 12, deepRuns: 5 },
] as const;

export const TOP_UP = { credits: 10, price: 25 } as const;
export const DEEP_PACK = { runs: 5, price: 20 } as const;

export const perCredit = (plan: Plan, yearly: boolean) =>
  plan.credits === 0 ? 0 : (yearly ? yearlyTotal(plan) / 12 : plan.monthly) / plan.credits;

export type CompareRow = {
  label: string;
  values: Record<PlanId, string | boolean>;
};

export const COMPARISON: CompareRow[] = [
  { label: "Credits (2,500 words each)", values: { free: "2 once", creator: "15 / mo", pro: "50 / mo", studio: "150 / mo" } },
  { label: "Deep research runs", values: { free: false, creator: "2 / mo", pro: "8 / mo", studio: "20 / mo" } },
  { label: "Standard research with sources", values: { free: true, creator: true, pro: true, studio: true } },
  { label: "Script with visual cues", values: { free: true, creator: true, pro: true, studio: true } },
  { label: "Clean script with sources", values: { free: true, creator: true, pro: true, studio: true } },
  { label: "AI-pattern audit", values: { free: true, creator: true, pro: true, studio: true } },
  { label: "Longest script", values: { free: "2,500 words", creator: "5,000 words", pro: "12,500 words", studio: "30,000 words" } },
  { label: "Your own sources", values: { free: false, creator: false, pro: true, studio: true } },
  { label: "Channel voice profiles", values: { free: "0", creator: "1", pro: "5", studio: "Unlimited" } },
  { label: "Export", values: { free: "Copy", creator: "TXT, MD", pro: "TXT, MD, DOCX", studio: "TXT, MD, DOCX" } },
  { label: "Connect your own AI agent (MCP)", values: { free: false, creator: "Soon", pro: "Soon", studio: "Soon" } },
  { label: "Batch queue", values: { free: false, creator: false, pro: false, studio: "10 at once" } },
  { label: "Team seats", values: { free: "1", creator: "1", pro: "1", studio: "3" } },
  { label: "Priority research queue", values: { free: false, creator: false, pro: true, studio: true } },
];

export const PRICING_FAQ = [
  {
    q: "What is a credit?",
    a: "One credit pays for a finished script of up to 2,500 words, about 17 minutes of narration. Research and both versions are included. A 10,000-word script uses 4 credits and a 25,000-word script uses 10.",
  },
  {
    q: "What is the difference between standard and deep research?",
    a: "Standard research reads and cites a focused set of live pages and is included in every credit. Deep research sends TinyFish's research agent to work for 5 to 20 minutes across far more sources. It is limited by the deep runs in your plan because each run costs real money to produce. Long scripts use more runs: 2 for 10,000 words, 4 for 25,000.",
  },
  {
    q: "What happens if a run fails?",
    a: "You are only charged for scripts that finish. If research or writing fails part way, the credits and deep runs for that job go back to your balance.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Monthly credits and deep runs reset each billing period. Credits from a top-up pack never expire.",
  },
  {
    q: "Can I switch plans or cancel?",
    a: "Yes. Upgrade whenever you like and the change applies right away. Monthly plans cancel any time. Yearly plans cost ten months and cover twelve, and you can turn off renewal at any point.",
  },
  {
    q: "Can I use my own AI agent?",
    a: "That is planned for every paid plan. You will connect leksmedias to Claude Code, Codex, Antigravity, Hermes or any MCP-capable agent and let it call our research and checks, writing with your own subscription.",
  },
];
