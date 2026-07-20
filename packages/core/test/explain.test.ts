import { describe, it, expect } from "vitest";
import { sortFindingsBySeverity, selectTopFindings } from "../src/explain.js";
import type { Finding } from "../src/types.js";

function f(severity: Finding["severity"]): Finding {
  return { category: "repeated_chars", severity, matchedRange: null, explanation: "x" };
}

describe("explain", () => {
  it("sorts findings by severity descending", () => {
    const sorted = sortFindingsBySeverity([f("low"), f("critical"), f("medium"), f("high")]);
    expect(sorted.map((x) => x.severity)).toEqual(["critical", "high", "medium", "low"]);
  });

  it("selects at most 3 top findings", () => {
    const sorted = sortFindingsBySeverity([f("low"), f("critical"), f("medium"), f("high"), f("low")]);
    expect(selectTopFindings(sorted)).toHaveLength(3);
  });
});
