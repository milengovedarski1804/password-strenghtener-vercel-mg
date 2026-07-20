import { describe, it, expect } from "vitest";
import { detectStructural } from "../src/detectors/structural.js";

describe("detectStructural", () => {
  it("flags too_short with high severity below 8 chars", () => {
    const findings = detectStructural("ab1");
    const f = findings.find((f) => f.category === "too_short");
    expect(f?.severity).toBe("high");
  });

  it("flags too_short with medium severity between 8 and 11 chars", () => {
    const findings = detectStructural("abcdefgh1");
    const f = findings.find((f) => f.category === "too_short");
    expect(f?.severity).toBe("medium");
  });

  it("does not flag too_short at 12+ chars", () => {
    const findings = detectStructural("abcdefghijkl1A!");
    expect(findings.find((f) => f.category === "too_short")).toBeUndefined();
  });

  it("flags single_char_class for lowercase-only password", () => {
    const findings = detectStructural("abcdefghijkl");
    expect(findings.some((f) => f.category === "single_char_class")).toBe(true);
  });

  it("flags pure_digits for all-numeric password", () => {
    const findings = detectStructural("123456789012");
    expect(findings.some((f) => f.category === "pure_digits")).toBe(true);
    expect(findings.some((f) => f.category === "single_char_class")).toBe(true);
  });

  it("does not flag single_char_class for mixed password", () => {
    const findings = detectStructural("Abcdef123!@#");
    expect(findings.find((f) => f.category === "single_char_class")).toBeUndefined();
  });
});
