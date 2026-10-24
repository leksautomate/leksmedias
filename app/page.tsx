import Link from "next/link";
import { EarlyAccessForm } from "@/components/EarlyAccessForm";
import { Faq } from "@/components/Faq";
import { FormatRow } from "@/components/FormatRow";
import { PricingTable } from "@/components/PricingTable";
import { SampleTabs } from "@/components/SampleTabs";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE } from "@/lib/site";

const STEPS = [
  {
    n: "1",
    title: "Drop in a topic",
    body: "Pick a format, a length and a niche. Add a line about your channel's tone if you want it to sound like you.",
  },
  {
    n: "2",
    title: "AI researches the web",
    body: "TinyFish's research agent reads live pages, weighs the sources and returns a cited report. You watch the plan build in real time.",
  },
  {
    n: "3",
    title: "Get two scripts",
    body: "One with visual cues and timestamps for your editor. One clean, voiceover-ready, with every claim tied to a source.",
  },
];

const FEATURES = [
  {
    title: "Every claim has a source",
    body: "The writer only uses facts that came back from research. Anything it cannot source is flagged for you instead of guessed.",
  },
  {
    title: "Hooks that hold people",
    body: "Six proven hook patterns, a pivot back to tension every 60 to 90 seconds, and sections linked by but and therefore, not and then.",
  },
  {
    title: "Audited for AI tells",
    body: "Each script is checked for stray em dashes, setup phrases before colons, no-this-no-that fragments and made-up statistics before you see it.",
  },
  {
    title: "Editor-ready or voice-ready",
    body: "The visual version comes with B-roll, on-screen text and music cues. The clean version has no brackets, timestamps or links, so text-to-speech never stumbles.",
  },
  {
    title: "Long-form, kept consistent",
    body: "Hour-long scripts are written section by section, each anchored to the last, so the voice and the facts do not drift.",
  },
  {
    title: "Your sources, your call",
    body: "Paste your own links or documents and the research starts from what you already trust.",
  },
];

const HOME_FAQ = [
  {
    q: "Where does the research come from?",
    a: "TinyFish's research agent searches the live web, reads the pages, ranks the sources and returns a report with citations. Every factual line in your script maps back to one of those sources, and you can open each one.",
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
    q: "What is a credit?",
    a: "One credit is one finished script of up to 12 minutes, research and both versions included. Longer scripts use one more credit for every extra 12 minutes.",
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
        <section
          id="early-access"
          className="divider relative isolate overflow-hidden bg-black pb-24 pt-40 text-center sm:pt-52"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgb(229_9_20/0.45),transparent_70%),linear-gradient(to_bottom,transparent_55%,#000)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,#000,transparent_70%)]"
          />
          <div className="mx-auto max-w-4xl px-5 sm:px-8">
            <p className="mb-5 inline-block rounded-full border border-line px-4 py-1 text-sm text-soft">
              Research powered by TinyFish AI
            </p>
            <h1 className="text-balance text-[2.5rem] font-bold leading-[1.08] tracking-tight sm:text-[3.5rem]">
              Faceless scripts, researched for you.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-soft sm:text-2xl">
              Give it a topic. AI reads the live web, cites every source, and writes a retention-built script in two
              versions, ready to produce today.
            </p>
            <p className="mt-7 text-lg text-soft sm:text-xl">Your first script is free. No card required.</p>
            <div className="relative mt-5">
              <EarlyAccessForm source="hero" id="hero" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="divider scroll-mt-4 px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold sm:text-5xl">From idea to publish-ready in three steps</h2>
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-lg bg-gradient-to-br from-panel-3 to-panel p-7">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-bold">
                    {s.n}
                  </span>
                  <h3 className="mt-5 text-2xl font-bold">{s.title}</h3>
                  <p className="mt-3 text-soft">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Two outputs */}
        <section id="output" className="divider px-5 py-20 sm:px-8">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h2 className="text-3xl font-bold sm:text-5xl">Two scripts from every run</h2>
              <p className="mt-5 text-lg text-soft sm:text-2xl">
                The same researched story, packaged for the two ways people actually produce videos.
              </p>
              <dl className="mt-8 space-y-6">
                <div>
                  <dt className="text-xl font-bold">With visuals</dt>
                  <dd className="mt-1 text-soft">
                    Timestamped sections with B-roll, images, on-screen text and music cues. Hand it to an editor and
                    start cutting.
                  </dd>
                </div>
                <div>
                  <dt className="text-xl font-bold">Clean, with sources</dt>
                  <dd className="mt-1 text-soft">
                    Pure narration for voiceover or text-to-speech, followed by a fact-check list that ties each claim
                    to a source you can open.
                  </dd>
                </div>
              </dl>
              <p className="mt-6 text-sm text-mute">Abbreviated sample. Facts checked against the cited sources.</p>
            </div>
            <SampleTabs />
          </div>
        </section>

        {/* Formats */}
        <section className="divider overflow-hidden px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold sm:text-5xl">Built for every faceless format</h2>
            <p className="mt-4 max-w-2xl text-lg text-soft">
              Each format has its own hook pattern and structure, so a listicle never reads like a documentary.
            </p>
            <div className="mt-10">
              <FormatRow />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="divider px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold sm:text-5xl">Research first. Then the writing.</h2>
            <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="border-t-2 border-brand pt-5">
                  <h3 className="text-xl font-bold">{f.title}</h3>
                  <p className="mt-2 text-soft">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="divider scroll-mt-4 px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold sm:text-5xl">Simple pricing, paid per script</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-soft">
              One credit is one finished script of up to 12 minutes, research and both versions included.
            </p>
            <div className="mt-12">
              <PricingTable />
            </div>
            <p className="mt-8 text-center">
              <Link href="/pricing" className="text-soft underline hover:text-white">
                Compare every plan
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="divider scroll-mt-4 px-5 py-20 sm:px-8">
          <h2 className="text-center text-3xl font-bold sm:text-5xl">Frequently asked questions</h2>
          <div className="mt-12">
            <Faq items={HOME_FAQ} />
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 py-24 text-center sm:px-8">
          <h2 className="mx-auto max-w-3xl text-balance text-3xl font-bold sm:text-5xl">
            Your next video starts with a script you can trust.
          </h2>
          <p className="mt-4 text-lg text-soft sm:text-xl">Join the early-access list. Your first script is free.</p>
          <div className="relative mt-8">
            <EarlyAccessForm source="footer" id="footer" />
          </div>
        </section>
      </main>
      <div className="border-t-8 border-panel">
        <SiteFooter />
      </div>
    </>
  );
}
