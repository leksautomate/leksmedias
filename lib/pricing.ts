import { REFUND } from "@/lib/legal";

// One balance: credits. A script costs credits by word count, deep research costs credits per run.
// Sized from real provider prices. See docs/COSTS.md and docs/cost-model.py.
export type PlanId = "free" | "starter" | "creator" | "pro" | "studio";

export type Feature = { text: string; soon?: boolean };

export type Plan = {
  id: PlanId;
  name: string;
  blurb: string;
  /** Price in USD when billed monthly. */
  monthly: number;
  /** Credits granted per period (once for the free trial). */
  credits: number;
  /** Longest single script, in words. */
  maxWords: number;
  /** Deep research available on this plan. */
  deepResearch: boolean;
  oneTime?: boolean;
  featured?: boolean;
  cta: string;
  features: Feature[];
};

/** Credits for a standard 2,500-word script. Used to show "about N scripts". */
export const STANDARD_SCRIPT_CREDITS = 150;
/** One TinyFish Research run costs us $2 to $3, so it is priced in credits too. */
export const DEEP_RUN_CREDITS = 800;
/** Yearly billing = pay 10 months, get 12. */
export const YEARLY_MONTHS_CHARGED = 10;

const round2 = (n: number) => Math.round(n * 100) / 100;
export const yearlyTotal = (p: Plan) => round2(p.monthly * YEARLY_MONTHS_CHARGED);
export const yearlyPerMonth = (p: Plan) => round2(yearlyTotal(p) / 12);
export const standardScripts = (p: Plan) => Math.floor(p.credits / STANDARD_SCRIPT_CREDITS);

/** Price of 1,000 credits on a plan, so tiers are easy to compare. */
export const per1kCredits = (p: Plan, yearly: boolean) =>
  p.credits === 0 ? 0 : ((yearly ? yearlyTotal(p) / 12 : p.monthly) / p.credits) * 1000;

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free trial",
    blurb: "See a full researched script before you pay.",
    monthly: 0,
    credits: 300,
    maxWords: 2500,
    deepResearch: false,
    oneTime: true,
    cta: "Try it free",
    features: [
      { text: "300 credits, one time" },
      { text: "Standard research with cited sources" },
      { text: "Both script versions" },
      { text: "Scripts up to 2,500 words" },
    ],
  },
  {
    id: "starter",
    name: "Starter",
    blurb: "For a creator getting started.",
    monthly: 9.99,
    credits: 1000,
    maxWords: 2500,
    deepResearch: false,
    cta: "Get early access",
    features: [
      { text: "1,000 credits a month, about 6 standard scripts" },
      { text: "Standard research with cited sources" },
      { text: "Both versions, with sources" },
      { text: "All 6 script formats" },
      { text: "Automatic AI-pattern audit" },
      { text: "Scripts up to 2,500 words" },
      { text: "Copy and TXT export" },
    ],
  },
  {
    id: "creator",
    name: "Creator",
    blurb: "For one channel posting every week.",
    monthly: 24.99,
    credits: 3500,
    maxWords: 5000,
    deepResearch: true,
    cta: "Get early access",
    features: [
      { text: "3,500 credits a month, about 23 standard scripts" },
      { text: "Everything in Starter" },
      { text: "Deep research, 800 credits a run" },
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
    monthly: 49.99,
    credits: 9000,
    maxWords: 12500,
    deepResearch: true,
    featured: true,
    cta: "Get early access",
    features: [
      { text: "9,000 credits a month, about 60 standard scripts" },
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
    monthly: 149.99,
    credits: 30000,
    maxWords: 30000,
    deepResearch: true,
    cta: "Get early access",
    features: [
      { text: "30,000 credits a month, about 200 standard scripts" },
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

/**
 * Credits per script by length. Narration time assumes 150 words a minute.
 * `deepRuns` is how many TinyFish runs a deep-research script uses (lean policy).
 * With deep research a script costs `credits + deepRuns * DEEP_RUN_CREDITS`.
 */
export const CREDIT_RULES = [
  { type: "Short video", words: 1200, time: "about 8 min", credits: 100, deepRuns: 1 },
  { type: "Standard video", words: 2500, time: "about 17 min", credits: 150, deepRuns: 1 },
  { type: "Long video", words: 5000, time: "about 33 min", credits: 300, deepRuns: 1 },
  { type: "Feature", words: 8000, time: "about 53 min", credits: 500, deepRuns: 2 },
  { type: "Documentary", words: 10000, time: "about 1 hr 7 min", credits: 600, deepRuns: 2 },
  { type: "Epic", words: 25000, time: "about 2 hr 47 min", credits: 1500, deepRuns: 4 },
  { type: "Marathon", words: 30000, time: "about 3 hr 20 min", credits: 1800, deepRuns: 5 },
] as const;

export const withDeep = (r: (typeof CREDIT_RULES)[number]) => r.credits + r.deepRuns * DEEP_RUN_CREDITS;

export const TOP_UP = { credits: 2000, price: 25 } as const;

export type CompareRow = {
  label: string;
  values: Record<PlanId, string | boolean>;
};

export const COMPARISON: CompareRow[] = [
  { label: "Credits", values: { free: "300 once", starter: "1,000 / mo", creator: "3,500 / mo", pro: "9,000 / mo", studio: "30,000 / mo" } },
  { label: "Standard scripts (150 credits)", values: { free: "2", starter: "6", creator: "23", pro: "60", studio: "200" } },
  { label: "Standard research with sources", values: { free: true, starter: true, creator: true, pro: true, studio: true } },
  { label: "Deep research (800 credits a run)", values: { free: false, starter: false, creator: true, pro: true, studio: true } },
  { label: "Script with visual cues", values: { free: true, starter: true, creator: true, pro: true, studio: true } },
  { label: "Clean script with sources", values: { free: true, starter: true, creator: true, pro: true, studio: true } },
  { label: "AI-pattern audit", values: { free: true, starter: true, creator: true, pro: true, studio: true } },
  { label: "Longest script", values: { free: "2,500 words", starter: "2,500 words", creator: "5,000 words", pro: "12,500 words", studio: "30,000 words" } },
  { label: "Your own sources", values: { free: false, starter: false, creator: false, pro: true, studio: true } },
  { label: "Channel voice profiles", values: { free: "0", starter: "0", creator: "1", pro: "5", studio: "Unlimited" } },
  { label: "Export", values: { free: "Copy", starter: "Copy, TXT", creator: "TXT, MD", pro: "TXT, MD, DOCX", studio: "TXT, MD, DOCX" } },
  { label: "Connect your own AI agent (MCP)", values: { free: false, starter: false, creator: "Soon", pro: "Soon", studio: "Soon" } },
  { label: "Batch queue", values: { free: false, starter: false, creator: false, pro: false, studio: "10 at once" } },
  { label: "Team seats", values: { free: "1", starter: "1", creator: "1", pro: "1", studio: "3" } },
  { label: "Priority research queue", values: { free: false, starter: false, creator: false, pro: true, studio: true } },
];

export const PRICING_FAQ = [
  {
    q: "How do credits work?",
    a: "Every script costs credits based on its length: 100 for a short video, 150 for a standard 2,500-word video, 300 for 5,000 words, 500 for 8,000 words and 600 for 10,000. Research and both versions are included. A 25,000-word script costs 1,500 credits.",
  },
  {
    q: "What is the difference between standard and deep research?",
    a: "Standard research reads and cites a focused set of live pages and is included in the script price. Deep research sends TinyFish's research agent to work for 5 to 20 minutes across far more sources. Each deep run costs 800 credits, and longer scripts use more runs: 2 for 10,000 words, 4 for 25,000. Deep research is available from the Creator plan.",
  },
  {
    q: "What happens if a run fails?",
    a: "You are only charged for scripts that finish. If research or writing fails part way, the credits for that job go back to your balance.",
  },
  {
    q: "Can I get a refund?",
    a: `Yes. Your first payment on a paid plan is refundable within ${REFUND.monthlyDays} days (${REFUND.yearlyDays} days for a yearly plan) if you have used ${REFUND.maxUsedPercent}% or less of its credits. If a plan renews by accident, tell us within ${REFUND.renewalWindowHours} hours. Credits for failed runs return automatically. See the refund policy in the footer for the details.`,
  },
  {
    q: "Do unused credits roll over?",
    a: "Monthly credits reset each billing period. Credits from a top-up pack never expire.",
  },
  {
    q: "Can I switch plans or cancel?",
    a: "Yes. Upgrade whenever you like and the change applies right away. Monthly plans cancel any time. Yearly plans cost ten months and cover twelve, and you can turn off renewal at any point.",
  },
  {
    q: "Can I use my own AI agent?",
    a: "That is planned for the paid plans from Creator up. You will connect Leksmedia to Claude Code, Codex, Antigravity, Hermes or any MCP-capable agent and let it call our research and checks, writing with your own subscription.",
  },
];
