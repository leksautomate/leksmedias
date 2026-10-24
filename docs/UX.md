# User experience plan

The product has one job: get a creator from a topic to a script they trust, fast, and show them why they can trust it. Every decision below serves either **speed to first script** or **trust in the facts**.

## 1. Principles

1. **First script in under 5 minutes of effort.** Research takes minutes, but the user's own work should be a topic and two clicks.
2. **Show the work.** Sources, the fact list and the audit result are visible, not hidden behind a tab nobody opens. Trust is the product.
3. **No surprise costs.** Show the credit and deep-run cost before every run, and the balance after.
4. **Never lose work, never lose credits.** Runs survive closing the tab. Failures refund automatically and say so.
5. **Defaults over decisions.** Smart presets for every field. Advanced options stay folded.
6. **Honest about limits.** If a topic has few sources, say so before spending credits.

## 2. Journey

```
Landing → Early access / Sign up → Verify email → First-run → Brief → Cost preview
   → Research (live) → Fact list review → Script ready → Edit / Export → Library → Upgrade
```

### 2.1 Landing and pricing (built)
Visitor understands the product in five seconds (headline, two-output sample) and can see real prices without a sales call. Already in the repo. Next: add real social proof and a demo video once there are users.

### 2.2 Sign up
- Email and Google sign-in, no password wall to start. Email verified before the free credits are released (abuse control).
- Ask nothing else at sign-up. Ask for channel name and niche **after** the first script, as a way to improve the next one.

### 2.3 First run (onboarding)
Goal: finished script in the first session.
- Empty dashboard shows one big card: **"Write your first script"** with the free credits count, plus three one-click example topics so nobody faces a blank box.
- The brief form is pre-filled from the chosen example. A checklist (Brief, Research, Script, Audit) appears with the first step ticked.
- Because research takes minutes, the first run shows what is happening and offers: "Keep this tab open, or we will email you." Most first-timers stay for the live progress, so make that the best part of the product.

### 2.4 The brief
Single page, five fields visible, rest folded.

| Field | Default | Notes |
| --- | --- | --- |
| Topic | none | Placeholder examples rotate. Paste a title or a paragraph; we extract the topic |
| Format | Documentary | Six cards with a one-line hook example each |
| Length | 1,800 words | Slider with minutes shown live; presets for Short, Standard, Documentary, Epic |
| Research depth | Standard | Deep shown with the time and run cost, disabled with an upgrade nudge if the plan has none |
| Voice | Channel profile if any | Folded: tone notes, sources to include, things to avoid |

A **live cost line** under the form: "This will use 4 credits and 2 deep runs, about 25 minutes. You have 11 credits and 6 runs left." Changing length or depth updates it instantly. The submit button repeats it: "Write script (4 credits)".

Pre-flight check before charging: a quick search tells us if the topic has enough public sources. If not: "We found limited sources for this topic. Continue, narrow it, or add your own links?"

### 2.5 Research in progress
The wait is the biggest UX risk. Turn it into a feature.
- A stage tracker: **Researching → Checking facts → Outlining → Writing section 2 of 4 → Auditing**.
- A live feed of real events from TinyFish ("Searching: Blockbuster store count 2004", "Reading: en.wikipedia.org...") as they arrive. It proves the research is real.
- Honest time estimate with a range, and queue position if we are busy ("2 runs ahead of you, about 8 minutes").
- **Leave and come back**: runs continue server-side. Notify by email, and browser notification if allowed. The dashboard shows running jobs with progress.
- Cancel is always available, and says what will be refunded.
- If a stage fails, retry automatically once. If it still fails, refund and explain in plain words, never "Error 500".

### 2.6 Fact list review (trust moment)
Before writing the full script, show the **fact list**: each claim, its source, and a confidence tag.
- One-click remove or add a fact. Paste a link to add a source.
- Facts about living people carry a "this is an allegation, keep it framed as one" flag.
- Skippable ("Looks good, write it") because most users will skip it, but visible because it is what makes the product credible. For long-form (over 5,000 words) the **outline** is also shown for approval, since a bad outline wastes a lot.

### 2.7 Result page
The page the user came for. Optimise it.
- **Two tabs, same position as the landing sample**: With visuals, Clean + sources. Remember the last tab used.
- Sticky toolbar: Copy, Download (TXT, MD, DOCX by plan), word count, estimated duration, audit badge ("Audit complete, 4 fixes").
- Left rail on desktop: section outline with word counts, click to jump. On mobile it becomes a drawer.
- In the Clean tab, sentences carry a small source marker. Hover or tap shows the source, title and a link. Sources panel lists all with "open" and "this claim used it".
- **Section actions**: regenerate with a note ("make it more dramatic", "shorter"), shorten, extend. Regeneration shows the credit cost first and is free for a defined number of retries per script.
- Hook alternatives: "Show 3 other hooks" in the first section.
- Audit panel: what was fixed (em dashes removed, setup phrases rewritten) and anything we could not verify, listed, never buried.
- Footer nudge, not a modal: "Facts come from the sources listed. Skim them before you publish anything about real people."

### 2.8 Library
Grid or list of past scripts with topic, format, words, date, and cost. Search, filter by format, favourite, duplicate as a template, delete. Opening one restores the exact tab and scroll position.

### 2.9 Upgrade and billing
- Upgrade prompts appear at the moment of need, never as popups on arrival: when a plan limit blocks a choice ("Scripts over 5,000 words are on Pro"), when credits run low (at 20%), and after a great result.
- The prompt always shows what they would get and the price, with one button to Stripe checkout and back to exactly where they were.
- A usage page: credits, deep runs, renewal date, history of every charge and refund. Self-serve cancel, pause, and plan change, with no hidden steps.

### 2.10 Connect your AI agent
In Settings, an **Integrations** tab: create an API key, copy a ready-made config for Claude Code, Codex, Antigravity or Hermes, and see the agent's recent calls and spend. Detail in [`MCP.md`](MCP.md).

## 3. Copy and tone
Plain, specific, calm. No hype words. Say what happens and what it costs. Error messages state the cause, what we did about it, and what the user can do.

## 4. Accessibility and inclusion
- WCAG 2.2 AA: contrast (white on `#141414` and on `#e50914` text is checked; muted text stays at 50% white or above on dark panels only), visible focus, full keyboard use, labels on every input.
- Tabs, accordions and toggles use proper roles (already done on the landing page).
- Respect reduced motion. No auto-playing animation.
- Live regions announce progress changes for screen readers.
- Output language: support `output_language` from the start (TinyFish supports BCP 47 tags), so non-English creators are not an afterthought.

## 5. Performance
- Landing and pricing are static: target LCP under 2.0 s, no layout shift, under 100 KB of JavaScript on first load.
- App pages stream; the result page renders sections as they finish.
- Progress uses Server-Sent Events with reconnect, not polling.
- Large scripts (25,000 words) render in chunks and virtualise long lists so the page stays smooth.

## 6. Mobile
Creators research on phones and edit on desktops. Everything works at 360 px. The brief, progress and notifications are first-class on mobile; the result page is readable and copyable on mobile, with heavy editing aimed at desktop.

## 7. Trust and safety UX
- Allegation-aware framing for true crime and exposés; a clear notice when the topic involves a real, living person.
- Visible source quality labels (primary, news, reference, community).
- "Why can I trust this?" link on the result page explaining the grounding rule in two sentences.

## 8. Notifications
Email: run finished, run failed and refunded, credits low, weekly digest. Browser push when permitted. No marketing email without consent; one-click unsubscribe.

## 9. Metrics

| Metric | Target to start |
| --- | --- |
| Visit to early-access signup | 6% or higher |
| Signup to first script started | 60% |
| **Activation: first script finished within 24 h** | 45% |
| Median time from topic to finished (standard research) | under 8 min |
| Share who open Sources panel | 50% (tells us trust matters) |
| Script regeneration rate per script | under 1.2 |
| Free to paid within 14 days | 8% |
| Month-2 retention of paying users | 70% |
| Support tickets per 100 scripts | under 3 |

Instrument events from day one: `brief_started`, `brief_submitted`, `research_event_seen`, `run_completed`, `run_failed`, `result_viewed`, `tab_switched`, `source_opened`, `copy_clicked`, `export_clicked`, `regenerate_clicked`, `upgrade_prompt_seen`, `checkout_started`, `checkout_completed`. Use a privacy-friendly analytics tool and never send script text.

## 10. Experiments, in order of expected value
1. Cost preview wording and placement.
2. Example topics on the empty state vs a blank form.
3. Showing the live research feed vs a simple progress bar.
4. Yearly toggle default (yearly vs monthly) on the pricing page.
5. Free trial of 2 credits vs 3.
6. Fact list review shown by default vs behind a link.

## 11. Build order for the app UX
1. Auth, empty state, brief with live cost line.
2. Run page with stage tracker and real research events.
3. Result page with both tabs, copy and export.
4. Credits, balances and Stripe upgrade flow.
5. Library, fact list review, section regenerate.
6. Integrations tab and notifications.
