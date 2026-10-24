export type PlanId = "free" | "creator" | "pro" | "studio";

export type Feature = { text: string; soon?: boolean };

export type Plan = {
  id: PlanId;
  name: string;
  blurb: string;
  /** Monthly price in USD when billed monthly. */
  monthly: number;
  /** Per-month price in USD when billed yearly (20% off, rounded). */
  yearly: number;
  credits: number;
  /** Free plan credits are granted once, paid plans renew monthly. */
  creditsOneTime?: boolean;
  featured?: boolean;
  cta: string;
  features: Feature[];
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free trial",
    blurb: "See a full researched script before you pay.",
    monthly: 0,
    yearly: 0,
    credits: 2,
    creditsOneTime: true,
    cta: "Try it free",
    features: [
      { text: "2 credits, one time" },
      { text: "Deep research with cited sources" },
      { text: "Both script versions" },
      { text: "Scripts up to 12 minutes" },
      { text: "Copy to clipboard" },
    ],
  },
  {
    id: "creator",
    name: "Creator",
    blurb: "For one channel posting every week.",
    monthly: 29,
    yearly: 23,
    credits: 15,
    cta: "Get early access",
    features: [
      { text: "15 credits every month" },
      { text: "All 6 script formats" },
      { text: "Both script versions with sources" },
      { text: "Automatic AI-pattern audit" },
      { text: "Scripts up to 24 minutes" },
      { text: "1 channel voice profile" },
      { text: "Export to TXT and Markdown" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "For channels that publish several times a week.",
    monthly: 79,
    yearly: 63,
    credits: 50,
    featured: true,
    cta: "Get early access",
    features: [
      { text: "50 credits every month" },
      { text: "Everything in Creator" },
      { text: "Long-form up to 60 minutes, written section by section" },
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
    yearly: 159,
    credits: 150,
    cta: "Get early access",
    features: [
      { text: "150 credits every month" },
      { text: "Everything in Pro" },
      { text: "Unlimited channel voice profiles" },
      { text: "Batch queue, 10 scripts at once" },
      { text: "3 team seats" },
      { text: "Priority support" },
      { text: "API access", soon: true },
    ],
  },
];

/** What one credit buys. Research and both versions are included in every run. */
export const CREDIT_RULES = [
  { length: "Up to 12 min", words: "about 1,800 words", credits: 1 },
  { length: "13 to 24 min", words: "about 3,600 words", credits: 2 },
  { length: "25 to 36 min", words: "about 5,400 words", credits: 3 },
  { length: "37 to 48 min", words: "about 7,200 words", credits: 4 },
  { length: "49 to 60 min", words: "about 9,000 words", credits: 5 },
] as const;

export const TOP_UP = { credits: 10, price: 25 } as const;

export const perCredit = (plan: Plan, yearly: boolean) =>
  plan.credits === 0 ? 0 : (yearly ? plan.yearly : plan.monthly) / plan.credits;

export type CompareRow = {
  label: string;
  values: Record<PlanId, string | boolean>;
};

export const COMPARISON: CompareRow[] = [
  { label: "Credits", values: { free: "2 once", creator: "15 / mo", pro: "50 / mo", studio: "150 / mo" } },
  { label: "Cited deep research", values: { free: true, creator: true, pro: true, studio: true } },
  { label: "Script with visual cues", values: { free: true, creator: true, pro: true, studio: true } },
  { label: "Clean script with sources", values: { free: true, creator: true, pro: true, studio: true } },
  { label: "AI-pattern audit", values: { free: true, creator: true, pro: true, studio: true } },
  { label: "Longest script", values: { free: "12 min", creator: "24 min", pro: "60 min", studio: "60 min" } },
  { label: "Your own sources", values: { free: false, creator: false, pro: true, studio: true } },
  { label: "Channel voice profiles", values: { free: "0", creator: "1", pro: "5", studio: "Unlimited" } },
  { label: "Export", values: { free: "Copy", creator: "TXT, MD", pro: "TXT, MD, DOCX", studio: "TXT, MD, DOCX" } },
  { label: "Batch queue", values: { free: false, creator: false, pro: false, studio: "10 at once" } },
  { label: "Team seats", values: { free: "1", creator: "1", pro: "1", studio: "3" } },
  { label: "Priority research queue", values: { free: false, creator: false, pro: true, studio: true } },
];

export const PRICING_FAQ = [
  {
    q: "What is a credit?",
    a: "One credit pays for one finished script of up to 12 minutes. That covers the research, the version with visual cues, and the clean version with sources. Longer scripts use one extra credit for every additional 12 minutes.",
  },
  {
    q: "What happens if a run fails?",
    a: "You are only charged for scripts that finish. If research or writing fails part way, the credits for that run go back to your balance.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Monthly credits reset each billing period. Credits from a top-up pack never expire.",
  },
  {
    q: "Can I switch plans or cancel?",
    a: "Yes. Upgrade whenever you like and the change applies right away. Monthly plans cancel any time. Yearly plans renew once a year and you can turn that off at any point.",
  },
  {
    q: "Why are long scripts gated to Pro?",
    a: "A 60-minute script is written in sections so the voice and the facts stay consistent. It takes several times the research and writing of a standard script, so it sits on the plans built for that volume.",
  },
];
