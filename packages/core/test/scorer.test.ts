import { describe, it, expect } from "vitest";
import { computeScore } from "../src/scorer.js";
import type { Finding } from "../src/types.js";

describe("computeScore", () => {
  it("returns score 100 and label 'много силна' for no findings", () => {
    const { score, label } = computeScore([]);
    expect(score).toBe(100);
    expect(label).toBe("много силна");
  });

  it("caps label at 'слаба' when breached_password is present, regardless of score", () => {
    const findings: Finding[] = [
      {
        category: "breached_password",
        severity: "critical",
        matchedRange: null,
        explanation: "test",
      },
    ];
    const { label } = computeScore(findings);
    expect(["много слаба", "слаба"]).toContain(label);
  });

  it("never returns a negative score", () => {
    const manyFindings: Finding[] = Array.from({ length: 10 }, () => ({
      category: "repeated_chars",
      severity: "critical",
      matchedRange: null,
      explanation: "test",
    }));
    const { score } = computeScore(manyFindings);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("applies diminishing penalty so many low-severity findings don't crater the score", () => {
    const manyLow: Finding[] = Array.from({ length: 6 }, () => ({
      category: "repeated_chars",
      severity: "low",
      matchedRange: null,
      explanation: "test",
    }));
    const { score } = computeScore(manyLow);
    expect(score).toBeGreaterThan(50);
  });
});
