import { describe, it, expect } from "vitest";
import { detectComposite } from "../src/detectors/composite.js";
import type { Finding } from "../src/types.js";

const wordFinding: Finding = {
  category: "dictionary_word",
  severity: "medium",
  matchedRange: [0, 5],
  explanation: "test",
};

const dateFinding: Finding = {
  category: "date_pattern",
  severity: "medium",
  matchedRange: [5, 11],
  explanation: "test",
};

describe("detectComposite", () => {
  it("flags composite pattern when a word and a date coexist", () => {
    const findings = detectComposite("short1", [wordFinding, dateFinding]);
    expect(findings.some((f) => f.category === "composite_pattern")).toBe(true);
  });

  it("does not flag composite pattern for a long, complex password", () => {
    const longComplex = "Xk9$mQ2!vLp8&nR4wZ";
    const findings = detectComposite(longComplex, [wordFinding, dateFinding]);
    expect(findings).toHaveLength(0);
  });

  it("does not flag composite pattern without both a word and context finding", () => {
    const findings = detectComposite("short1", [wordFinding]);
    expect(findings).toHaveLength(0);
  });
});
