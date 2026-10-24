import { describe, expect, it } from "vitest";
import { autofix, lint, splitSentences, wordCount } from "@/lib/core/lint";
import {
  assembleClean,
  assembleVisual,
  buildSourcesReport,
  narrationParagraphs,
  parseRaw,
  stripTags,
} from "@/lib/core/script";

const RAW = `## Hook
[B-ROLL: Blockbuster storefront at night]
In 2000, Blockbuster could have bought a small DVD-by-mail startup for fifty million dollars. {f1} It said no. {f1} Ten years later, it filed for bankruptcy, but the startup kept growing. {f2,f3}
[TEXT ON SCREEN: "$50 million"]
So how did it get here?

## The empire
[IMAGE: Dallas street, 1985]
It started in Dallas with one shop. {f4}
By 2004 it had 9,094 stores. {f5}`;

const FACTS = [
  { n: 1, claim: "Blockbuster turned down a chance to buy Netflix for $50 million in 2000", sourceNs: [1] },
  { n: 2, claim: "Blockbuster filed for Chapter 11 on September 23, 2010", sourceNs: [1] },
  { n: 3, claim: "Netflix kept growing after 2010", sourceNs: [2] },
  { n: 4, claim: "David Cook opened the first store in Dallas in 1985", sourceNs: [1] },
  { n: 5, claim: "Blockbuster had 9,094 stores in 2004", sourceNs: [1], allegation: false },
];
const SOURCES = [
  { n: 1, url: "https://en.wikipedia.org/wiki/Blockbuster_LLC", title: "Blockbuster LLC" },
  { n: 2, url: "https://en.wikipedia.org/wiki/Netflix", title: "Netflix" },
];

describe("parseRaw", () => {
  const items = parseRaw(RAW);
  it("separates headings, cues and narration", () => {
    expect(items.map((i) => i.kind)).toEqual([
      "heading", "cue", "narration", "cue", "narration", "heading", "cue", "narration",
    ]);
  });
  it("removes tags from the text and keeps them on the sentence", () => {
    const hook = items[2];
    if (hook.kind !== "narration") throw new Error("expected narration");
    expect(hook.text).not.toMatch(/[{}]/);
    expect(hook.sentences[0].factNs).toEqual([1]);
    expect(hook.sentences[2].factNs).toEqual([2, 3]);
  });
  it("joins consecutive lines into one paragraph", () => {
    const merged = parseRaw("First line of a paragraph.\nSecond line follows. {f9}\n\nNew paragraph.");
    expect(merged.filter((i) => i.kind === "narration")).toHaveLength(2);
  });
  it("strips markdown bold and code fences", () => {
    const x = parseRaw("```\n**Bold** words here.\n```");
    expect(x).toHaveLength(1);
    expect(x[0].kind === "narration" && x[0].text).toBe("Bold words here.");
  });
  it("accepts tags written without the f", () => {
    const x = parseRaw("A fact. {3,4}");
    expect(x[0].kind === "narration" && x[0].sentences[0].factNs).toEqual([3, 4]);
  });
});

describe("assembly", () => {
  const items = parseRaw(RAW);
  it("builds the editor version with cues and timestamps", () => {
    const v = assembleVisual(items);
    expect(v).toMatch(/^HOOK \(0:00-0:\d\d\)/);
    expect(v).toContain("[B-ROLL: Blockbuster storefront at night]");
    expect(v).toContain('[TEXT ON SCREEN: "$50 million"]');
    expect(v).toMatch(/THE EMPIRE \(0:\d\d-0:\d\d\)/);
    expect(v).not.toMatch(/\{f/);
  });
  it("starts the second chapter exactly where the first ends", () => {
    const v = assembleVisual(items);
    const heads = [...v.matchAll(/\((\d+:\d\d)-(\d+:\d\d)\)/g)];
    expect(heads[1][1]).toBe(heads[0][2]);
  });
  it("builds a clean version that passes every format check", () => {
    const c = assembleClean(items);
    expect(c).not.toMatch(/[\[\]{}]/);
    expect(c).not.toMatch(/HOOK|\d:\d\d/);
    const issues = lint({ narration: narrationParagraphs(items), fullText: c, mode: "clean" });
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });
  it("opens an implicit Hook chapter when the model forgets the heading", () => {
    expect(assembleVisual(parseRaw("Just a sentence here."))).toMatch(/^HOOK \(/);
  });
});

describe("sources report", () => {
  it("lists used claims with their sources", () => {
    const r = buildSourcesReport(parseRaw(RAW), FACTS, SOURCES);
    expect(r.usedFactNs).toEqual([1, 2, 3, 4, 5]);
    expect(r.sourceNsUsed).toEqual([1, 2]);
    expect(r.text).toContain("1. Blockbuster turned down a chance to buy Netflix");
    expect(r.text).toContain("[1] Blockbuster LLC. https://en.wikipedia.org/wiki/Blockbuster_LLC");
    expect(r.invalidTags).toEqual([]);
  });
  it("flags numbers that carry no source and tags that point nowhere", () => {
    const raw = "## Hook\nIt cost 40 million dollars to build. It was big. {f1}\nA claim with a bad tag. {f99}";
    const r = buildSourcesReport(parseRaw(raw), FACTS, SOURCES);
    expect(r.unsourced).toEqual(["It cost 40 million dollars to build."]);
    expect(r.invalidTags).toEqual([99]);
    expect(r.text).toContain("Lines to verify");
  });
  it("marks allegations", () => {
    const facts = [{ n: 1, claim: "He took the money", sourceNs: [1], allegation: true }];
    const r = buildSourcesReport(parseRaw("Prosecutors say he took it. {f1}"), facts, SOURCES);
    expect(r.text).toContain("He took the money (allegation)");
  });
});

describe("lint", () => {
  const run = (text: string, mode: "visual" | "clean" = "visual") =>
    lint({ narration: [text], fullText: text, mode }).map((i) => i.rule);

  it("passes ordinary narration", () => {
    expect(run("In 2000 the company said no, but ten years later it was gone. So how did that happen?")).toEqual([]);
  });
  it("catches dashes", () => expect(run("He left — and never returned, but why?")).toContain("dash"));
  it("catches stock setup phrases", () => expect(run("Here's the thing: it failed, but why?")).toContain("setup_phrase"));
  it("catches 'Most people' openers", () => expect(run("It failed. Most people never saw it coming, but why?")).toContain("most_opener"));
  it("catches hype words", () => expect(run("It was a game-changing move, but it failed.")).toContain("hype_word"));
  it("catches No X. No Y. fragments", () => expect(run("No fuss. No delay. It was done, but why?")).toContain("no_fragments"));
  it("allows one not-X-but-Y contrast but flags two", () => {
    expect(run("It's not about money, it's about pride, but why?")).not.toContain("not_x_y");
    expect(run("It's not about money, it's about pride. That's not luck, that's planning, but why?")).toContain("not_x_y");
  });
  it("catches too many colons but not clock times", () => {
    expect(run("A: b. C: d. E: f. G: h, but why?")).toContain("colons");
    expect(run("At 3:41 the alarm sounded, but why? At 4:15 it stopped.")).not.toContain("colons");
  });
  it("catches choppy rhythm", () => expect(run("He ran. He fell. He hid. Then, but why?")).toContain("choppy"));
  it("checks the hook length and turn", () => {
    expect(run(Array(120).fill("word").join(" ") + ".")).toContain("hook_length");
    expect(run("A plain opening line with nothing unusual in it.")).toContain("hook_turn");
  });
  it("applies the strict rules only in clean mode", () => {
    const t = "He said [PAUSE] it at 0:30 (1:05-1:30) see https://x.com, but why?";
    expect(run(t, "visual")).not.toContain("brackets");
    const clean = run(t, "clean");
    expect(clean).toEqual(expect.arrayContaining(["brackets", "url", "timestamp"]));
  });
  it("detects leftover fact tags in the clean version", () => {
    expect(run("A claim, but why? {f2}", "clean")).toContain("fact_tag");
  });
});

describe("autofix", () => {
  it("replaces em dashes and spaced en dashes", () => {
    const r = autofix("He left — and never came back – ever. Gone —");
    expect(r.text).not.toMatch(/[—–]/);
    expect(r.fixes[0]).toMatch(/Replaced 3 dashes/);
  });
  it("leaves clean text alone", () => {
    const t = "Nothing to change here.";
    expect(autofix(t)).toEqual({ text: t, fixes: [] });
  });
  it("keeps ranges like 1985-1990 and hyphenated words", () => {
    expect(autofix("The well-known 1985-1990 era.").text).toBe("The well-known 1985-1990 era.");
  });
});

describe("text helpers", () => {
  it("splits sentences and keeps tags attached", () => {
    expect(splitSentences("One fact. {f1} Another one! {f2,f3} Done?")).toEqual(["One fact. {f1}", "Another one! {f2,f3}", "Done?"]);
  });
  it("counts words without tags", () => {
    expect(wordCount("Three plain words. {f1,f2}")).toBe(3);
    expect(stripTags("Hello there {f1} friend")).toBe("Hello there friend");
  });
});
