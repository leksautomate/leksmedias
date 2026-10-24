import { describe, expect, it } from "vitest";
import { DEEP_RUN_CREDITS, CREDIT_RULES, withDeep } from "@/lib/pricing";
import {
  deepRunsFor,
  formatDuration,
  planAllows,
  runCost,
  scriptCredits,
  sectionCount,
} from "@/lib/core/credits";

describe("scriptCredits", () => {
  it("matches the published tiers", () => {
    expect(scriptCredits(300)).toBe(100);
    expect(scriptCredits(1200)).toBe(100);
    expect(scriptCredits(1201)).toBe(150);
    expect(scriptCredits(2500)).toBe(150);
    expect(scriptCredits(2501)).toBe(300);
    expect(scriptCredits(5000)).toBe(300);
    expect(scriptCredits(8000)).toBe(500);
    expect(scriptCredits(10000)).toBe(600);
    expect(scriptCredits(25000)).toBe(1500);
    expect(scriptCredits(30000)).toBe(1800);
  });

  it("rejects out of range and non-numeric input", () => {
    expect(() => scriptCredits(299)).toThrow(RangeError);
    expect(() => scriptCredits(30001)).toThrow(RangeError);
    expect(() => scriptCredits(Number.NaN)).toThrow(RangeError);
  });

  it("never gets cheaper for longer scripts", () => {
    let prev = 0;
    for (let w = 300; w <= 30000; w += 50) {
      const c = scriptCredits(w);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
});

describe("deep research cost", () => {
  it("uses the documented number of runs", () => {
    expect(deepRunsFor(1200)).toBe(1);
    expect(deepRunsFor(2500)).toBe(1);
    expect(deepRunsFor(5000)).toBe(1);
    expect(deepRunsFor(10000)).toBe(2);
    expect(deepRunsFor(25000)).toBe(4);
    expect(deepRunsFor(30000)).toBe(5);
  });

  it("adds 800 credits per run", () => {
    expect(runCost(10000, "standard")).toEqual({ scriptCredits: 600, deepRuns: 0, deepCredits: 0, total: 600 });
    expect(runCost(10000, "deep")).toEqual({ scriptCredits: 600, deepRuns: 2, deepCredits: 1600, total: 2200 });
    expect(runCost(30000, "deep").total).toBe(1800 + 5 * DEEP_RUN_CREDITS);
  });

  it("agrees with the pricing page table for every row", () => {
    for (const r of CREDIT_RULES) {
      expect(scriptCredits(r.words)).toBe(r.credits);
      expect(deepRunsFor(r.words)).toBe(r.deepRuns);
      expect(runCost(r.words, "deep").total).toBe(withDeep(r));
    }
  });
});

describe("planAllows", () => {
  it("enforces script length per plan", () => {
    expect(planAllows("starter", 2500, "standard").ok).toBe(true);
    expect(planAllows("starter", 2501, "standard").ok).toBe(false);
    expect(planAllows("pro", 12500, "standard").ok).toBe(true);
    expect(planAllows("pro", 12501, "standard").ok).toBe(false);
    expect(planAllows("studio", 30000, "standard").ok).toBe(true);
  });

  it("gates deep research to Creator and above", () => {
    expect(planAllows("free", 1000, "deep").ok).toBe(false);
    expect(planAllows("starter", 1000, "deep").ok).toBe(false);
    expect(planAllows("creator", 1000, "deep").ok).toBe(true);
    expect(planAllows("studio", 1000, "deep").ok).toBe(true);
  });

  it("treats an unknown plan as the free plan", () => {
    expect(planAllows("nonsense", 3000, "standard").ok).toBe(false);
  });
});

describe("helpers", () => {
  it("counts sections", () => {
    expect(sectionCount(300)).toBe(1);
    expect(sectionCount(2500)).toBe(1);
    expect(sectionCount(2501)).toBe(2);
    expect(sectionCount(30000)).toBe(12);
  });
  it("formats narration time", () => {
    expect(formatDuration(150)).toBe("1:00");
    expect(formatDuration(1800)).toBe("12:00");
    expect(formatDuration(10000)).toBe("1:06:40");
  });
});
