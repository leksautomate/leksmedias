import Link from "next/link";
import { AgentTabs } from "@/components/AgentTabs";
import { Compare } from "@/components/Compare";
import { EarlyAccessForm } from "@/components/EarlyAccessForm";
import { Faq } from "@/components/Faq";
import { FormatRow } from "@/components/FormatRow";
import { PricingTable } from "@/components/PricingTable";
import { SampleTabs } from "@/components/SampleTabs";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { REFUND } from "@/lib/legal";
import { SITE } from "@/lib/site";

const PILLARS = [
  { title: "Cited research", sub: "Live web, every source" },
  { title: "Two outputs", sub: "Visual cues + clean" },
  { title: "Audited", sub: "No AI tells" },
  { title: "Your agent", sub: "Claude Code, Codex, more" },
];

const STATS = [
  { value: "6", label: "script formats", note: "each with its own hook pattern" },
  { value: "30,000", label: "words, longest script", note: "written section by section" },
  { value: "2", label: "scripts per run", note: "visual cues and clean" },
  { value: "5 to 20", label: "minutes of deep research", note: "typical TinyFish run" },
];

const VS_CHAT = [
  {
    label: "Research",
    left: "You hunt for sources, paste them in and check every claim yourself.",
    right: "Searches the live web and returns cited facts before a word is written.",
  },
  {
    label: "Facts",
    left: "No way to tell which lines came from where.",
    right: "Every claim is mapped to a source in a fact-check list you can open.",
  },
  {
    label: "The hook",
    left: "Whatever opener it reaches for first.",
    right: "Six hook patterns matched to your format, with a re-hook every 60 to 90 seconds.",
  },
  {
    label: "Long scripts",
    left: "Voice and facts can drift once a script runs past a few thousand words.",
    right: "Written section by section, each anchored to the last, up to 30,000 words.",
  },
  {
    label: "Visual cues",
    left: "You add B-roll and on-screen text by hand.",
    right: "Cues placed for your editor, plus a clean version for voiceover.",
  },
  {
    label: "Batches",
    left: "Context from one topic can leak into the next.",
    right: "Every script gets its own research run and its own fact list.",
  },
  {
    label: "Cleanup",
    left: "You find and rewrite the AI tells yourself.",
    right: "An automatic audit fixes setup phrases, stray em dashes and made-up numbers, and shows what changed.",
  },
] as const;

const VS_PACKS = [
  {
    label: "What you get",
    left: "A folder of prompts or skill files to learn and run yourself.",
    right: "A finished script, delivered.",
  },
  {
    label: "Setup",
    left: "Install the files, pick a model, learn the workflow.",
    right: "Type a topic. There is nothing to install.",
  },
  {
    label: "AI costs",
    left: "Your own AI subscription, on top of what you paid for the files.",
    right: "Research and writing are included in your credits.",
  },
  {
    label: "Research",
    left: "You gather the sources and feed them in.",
    right: "We research the live web and cite what we find.",
  },
  {
    label: "Quality checks",
    left: "You remember to run the audits.",
    right: "The audit runs on every script, automatically.",
  },
  {
    label: "Your time",
    left: "Prompting, re-prompting and fixing.",
    right: "A short brief, then you review and edit the result.",
  },
  {
    label: "Your own agent",
    left: "Whatever you build around the files.",
    right: "Optional: connect Claude Code, Codex and more over MCP (coming soon).",
  },
] as const;

const FOR_YOU = [
  "You make faceless videos, or you are about to start",
  "You want facts you can check before you publish",
  "You are happy to read and edit a strong first draft",
  "You would rather brief than build prompts",
];

const NOT_FOR_YOU = [
  "You want to publish without reading the script",
  "You expect a channel on autopilot",
  "You want to own and run a prompt system yourself",
  "You need fiction scripts today (it is on the roadmap)",
];

const STEPS = [
  {
    n: "01",
    title: "Drop in a topic",
    body: "Pick a format, a length and a niche. Add a line about your channel's tone if you want it to sound like you.",
  },
  {
    n: "02",
    title: "AI researches the web",
    body: "TinyFish reads live pages, weighs the sources and returns cited facts. Pick standard or deep research and watch the plan build in real time.",
  },
  {
    n: "03",
    title: "Get two scripts",
    body: "One with visual cues and timestamps for your editor. One clean, voiceover-ready, with every claim tied to a source.",
  },
];

const FEATURES = [
  {
    label: "Grounded",
    title: "Every claim has a source",
    body: "The writer only uses facts that came back from research. Anything it cannot source is flagged for you instead of guessed.",
  },
  {
    label: "Retention",
    title: "Hooks that hold people",
    body: "Six proven hook patterns, a pivot back to tension every 60 to 90 seconds, and sections linked by but and therefore, not and then.",
  },
  {
    label: "Audit",
    title: "Checked for AI tells",
    body: "Each script is checked for stray em dashes, setup phrases before colons, no-this-no-that fragments and made-up statistics before you see it.",
  },
  {
    label: "Output",
    title: "Editor-ready or voice-ready",
    body: "The visual version comes with B-roll, on-screen text and music cues. The clean version has no brackets, timestamps or links, so text-to-speech never stumbles.",
  },
  {
    label: "Long-form",
    title: "10,000 or 25,000 words",
    body: "Long scripts are written section by section, each anchored to the last, so the voice and the facts do not drift.",
  },
  {
    label: "Control",
    title: "Your sources, your call",
    body: "Paste your own links or documents and the research starts from what you already trust.",
  },
];

const HOME_FAQ = [
  {
    q: "Where does the research come from?",
    a: "TinyFish searches the live web, reads the pages and returns cited facts. Standard research does that for a focused set of sources. Deep research sends TinyFish's research agent out for 5 to 20 minutes across far more. Every factual line in your script maps back to a source you can open.",
  },
  {
    q: "Do I get the prompts or skill files?",
    a: "No. We do not sell prompts or skill files. We run the research, the writing rules and the checks for you and hand over the finished scripts. If you would rather use your own agent, MCP access (coming soon) lets it call our research and checks.",
  },
  {
    q: "Can I read a full sample before I sign up?",
    a: "Yes. The sample above shows both versions of a script. Your first script is free, so you can also run your own topic before you pay anything.",
  },
  {
    q: "What do I get from one run?",
    a: "Two finished scripts of the same video. The first has visual cues for your editor: B-roll, on-screen text, clips and music, with timestamps. The second is clean narration with no cues, plus a sources and fact-check list.",
  },
  {
    q: "Will it make things up?",
    a: "The writer is limited to facts from the research and flags anything it cannot source. Still, skim the source list before you publish anything about real people or events. You are the editor of record.",
  },
  {
    q: "Will the script sound like AI?",
    a: "Every script goes through an automatic audit for the patterns viewers spot fast, such as setup phrases before colons, no-this-no-that fragments, empty hype words and suspiciously specific numbers. You see what was fixed.",
  },
  {
    q: "Can I use the clean version with AI voiceover and video tools?",
    a: "Yes. It has no brackets, timestamps, speaker labels or links, so a text-to-speech voice reads only what you want spoken. Sources live in a separate block.",
  },
  {
    q: "How do credits work?",
    a: "Every script costs credits by length: 100 for a short video, 150 for a standard 2,500-word video, 300 for 5,000 words and 600 for 10,000. A 25,000-word script costs 1,500. Research and both versions are included, and deep research costs 800 credits a run.",
  },
  {
    q: "Can I use my own AI agent instead?",
    a: "That is on the roadmap for paid plans. You will connect Leksmedia to Claude Code, Codex, Antigravity, Hermes or any agent that supports MCP. Your agent calls our research, writing rules and checks, and writes with your own subscription.",
  },
  {
    q: "Is there a refund?",
    a: `Yes. If a paid plan is not right for you, we refund your first payment within ${REFUND.monthlyDays} days (${REFUND.yearlyDays} days for a yearly plan) as long as you have used ${REFUND.maxUsedPercent}% or less of its credits. Credits for a run that fails come back automatically. The full refund policy is linked in the footer.`,
  },
  {
    q: "Which topics work best?",
    a: "Anything with a trail of public information: business, history, true crime, celebrity, sports, tech and more. Fiction mode is on the roadmap.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section id="early-access" className="relative isolate overflow-hidden px-5 pb-20 pt-24 text-center sm:px-8 sm:pt-32">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,rgb(184_150_90/0.16),transparent_70%)]"
          />
          <div className="mx-auto max-w-4xl">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-1.5 font-mono text-xs text-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
              {SITE.name} · Research powered by TinyFish
            </p>
            <h1 className="h-display mt-8 text-[2.75rem] sm:text-6xl lg:text-[4.5rem]">
              Faceless scripts, <em>researched for you.</em>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-balance text-base leading-relaxed text-soft sm:text-lg">
              Give it a topic. AI reads the live web, cites every source, and writes a retention-built script in two
              versions, ready to produce today. From a 10-minute video to a 25,000-word documentary.
            </p>
            <p className="mt-9 font-mono text-xs text-mute">Your first script is free. No card required.</p>
            <div className="relative mt-4">
              <EarlyAccessForm source="hero" id="hero" />
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-4xl border-t border-line pt-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">Built into every script →</p>
            <ul className="mt-5 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
              {PILLARS.map((p) => (
                <li key={p.title} className="card px-4 py-4">
                  <p className="text-sm font-medium text-white">{p.title}</p>
                  <p className="mt-1 font-mono text-[11px] text-mute">{p.sub}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Stats */}
        <section className="border-t border-line px-5 py-16 sm:px-8" aria-label="Product numbers">
          <div className="mx-auto max-w-6xl">
            <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
              {STATS.map((s) => (
                <li key={s.label} className="bg-card px-6 py-8 text-center">
                  <p className="font-serif text-5xl italic text-gold sm:text-6xl">{s.value}</p>
                  <p className="mt-3 text-sm font-medium text-white">{s.label}</p>
                  <p className="mt-1 font-mono text-[11px] text-mute">{s.note}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-center font-mono text-[11px] text-mute">
              Product specs, not promises. Your retention depends on your topic, your edit and your voice.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t border-line px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">How it works</p>
            <h2 className="h-display mt-4 text-4xl sm:text-5xl">
              From idea to publish-ready <em>in three steps.</em>
            </h2>
            <ol className="mt-14 grid gap-5 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="card p-8">
                  <p className="eyebrow">Step {s.n}</p>
                  <h3 className="mt-4 font-serif text-3xl text-white">{s.title}</h3>
                  <p className="mt-3 leading-relaxed text-soft">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Two outputs */}
        <section id="output" className="border-t border-line px-5 py-24 sm:px-8">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">Two outputs</p>
              <h2 className="h-display mt-4 text-4xl sm:text-5xl">
                Two scripts <em>from every run.</em>
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-soft">
                The same researched story, packaged for the two ways people actually produce videos.
              </p>
              <dl className="mt-9 space-y-7">
                <div>
                  <dt className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-white">With visuals</dt>
                  <dd className="mt-2 text-soft">
                    Timestamped sections with B-roll, images, on-screen text and music cues. Hand it to an editor and
                    start cutting.
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-white">
                    Clean, with sources
                  </dt>
                  <dd className="mt-2 text-soft">
                    Pure narration for voiceover or text-to-speech, followed by a fact-check list that ties each claim
                    to a source you can open.
                  </dd>
                </div>
              </dl>
              <p className="mt-8 font-mono text-[11px] text-mute">Abbreviated sample. Facts checked against the cited sources.</p>
            </div>
            <div className="min-w-0">
              <SampleTabs />
            </div>
          </div>
        </section>

        {/* Research depth */}
        <section id="research" className="scroll-mt-20 border-t border-line px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="eyebrow">Research depth</p>
              <h2 className="h-display mt-4 text-4xl sm:text-5xl">
                Choose how <em>deep it goes.</em>
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-soft">
                Both are powered by TinyFish and both cite every source. Pick per script.
              </p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-2">
              <div className="card p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">Included in every credit</p>
                <h3 className="mt-4 font-serif text-3xl text-white">Standard research</h3>
                <p className="mt-3 leading-relaxed text-soft">
                  Searches the live web, reads the strongest pages and builds a cited fact list. Ready in a few minutes,
                  right for most videos.
                </p>
              </div>
              <div className="card border-gold p-8 shadow-[0_0_60px_-24px_var(--color-gold-glow)]">
                <p className="eyebrow">For your flagship videos</p>
                <h3 className="mt-4 font-serif text-3xl text-white">
                  Deep <em className="text-gold">research</em>
                </h3>
                <p className="mt-3 leading-relaxed text-soft">
                  TinyFish&apos;s research agent works for 5 to 20 minutes across far more sources, then cross-checks
                  them. Built for long documentaries, with more runs the longer the script.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Versus a chat AI */}
        <section id="why" className="scroll-mt-20 border-t border-line px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">Why not just use a chat AI?</p>
            <h2 className="h-display mt-4 max-w-3xl text-4xl sm:text-5xl">
              You can, and plenty of people start there. <em>Here is the difference.</em>
            </h2>
            <div className="mt-12">
              <Compare leftTitle="A chat AI on its own" rightTitle={SITE.name} rows={VS_CHAT} />
            </div>
          </div>
        </section>

        {/* Versus prompt packs: done for you */}
        <section className="border-t border-line px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">Done for you</p>
            <h2 className="h-display mt-4 max-w-3xl text-4xl sm:text-5xl">
              Not a prompt pack. <em>A finished script.</em>
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-soft">
              We do not sell prompts or skill files. You give us the topic, we do the research, the writing and the
              checks, and you get the script.
            </p>
            <div className="mt-12">
              <Compare leftTitle="Prompt packs and skill files" rightTitle={`${SITE.name}, done for you`} rows={VS_PACKS} />
            </div>
          </div>
        </section>

        {/* Formats */}
        <section className="border-t border-line px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">Formats</p>
            <h2 className="h-display mt-4 text-4xl sm:text-5xl">
              Built for every <em>faceless format.</em>
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-soft">
              Each format has its own hook pattern and structure, so a listicle never reads like a documentary.
            </p>
            <div className="mt-12">
              <FormatRow />
            </div>
          </div>
        </section>

        {/* Agents */}
        <section id="agents" className="scroll-mt-20 border-t border-line px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-1.5 font-mono text-xs text-soft">
              <span aria-hidden="true">&gt;_</span> Model Context Protocol · Coming soon
            </p>
            <h2 className="h-display mt-6 max-w-3xl text-4xl sm:text-5xl">
              Build on your own. Hook into <em>Claude Code, Codex &amp; any MCP host.</em>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-soft">
              Prefer your terminal or IDE? Connect {SITE.name} over MCP. Your agent calls our research, writing rules
              and checks, and writes with your own subscription.
            </p>
            <div className="mt-12">
              <AgentTabs />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-line px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">Engineered for trust</p>
            <h2 className="h-display mt-4 text-4xl sm:text-5xl">
              Research first. <em>Then the writing.</em>
            </h2>
            <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="card p-7">
                  <p className="eyebrow">{f.label}</p>
                  <h3 className="mt-3 font-serif text-2xl text-white">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-soft">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* For you / not for you */}
        <section className="border-t border-line px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">Built for creators who ship</p>
            <h2 className="h-display mt-4 text-4xl sm:text-5xl">
              Is this <em>for you?</em>
            </h2>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              <div className="card p-8">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-good">This is for you if</p>
                <ul className="mt-5 space-y-4">
                  {FOR_YOU.map((t) => (
                    <li key={t} className="flex gap-3 text-soft">
                      <span aria-hidden="true" className="font-mono text-good">
                        ✓
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-8">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-bad">Not for you if</p>
                <ul className="mt-5 space-y-4">
                  {NOT_FOR_YOU.map((t) => (
                    <li key={t} className="flex gap-3 text-soft">
                      <span aria-hidden="true" className="font-mono text-bad">
                        ✗
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mx-auto mt-10 max-w-2xl text-center text-lg leading-relaxed text-soft">
              You still make the calls and you still edit. The script just starts much closer to done.
            </p>
            <div className="mt-8 text-center">
              <p className="font-mono text-xs text-mute">You will know within your first script.</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link href="/#output" className="btn btn-ghost">
                  Read the sample
                </Link>
                <Link href="/#early-access" className="btn btn-primary">
                  Get your first script free <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-t border-line px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="eyebrow">Self-serve pricing</p>
              <h2 className="h-display mt-4 text-4xl sm:text-5xl">
                Simple plans. <em>Paid per script.</em>
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-soft">
                A standard 2,500-word script costs 150 credits. Cited research and both versions are always included.
              </p>
            </div>
            <div className="mt-14">
              <PricingTable />
            </div>
            <p className="mt-10 text-center">
              <Link href="/pricing" className="font-mono text-xs text-gold underline underline-offset-4 hover:text-white">
                Compare every plan →
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-line px-5 py-24 sm:px-8">
          <div className="text-center">
            <p className="eyebrow">FAQ</p>
            <h2 className="h-display mt-4 text-4xl sm:text-5xl">
              Frequently asked <em>questions.</em>
            </h2>
          </div>
          <div className="mt-14">
            <Faq items={HOME_FAQ} />
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative isolate overflow-hidden border-t border-line px-5 py-28 text-center sm:px-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_60%_at_50%_100%,rgb(184_150_90/0.14),transparent_70%)]"
          />
          <h2 className="h-display mx-auto max-w-3xl text-4xl sm:text-6xl">
            Your next video starts with <em>a script you can trust.</em>
          </h2>
          <p className="mt-5 text-lg text-soft">Join the early-access list. Your first script is free.</p>
          <div className="relative mt-9">
            <EarlyAccessForm source="footer" id="footer" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
