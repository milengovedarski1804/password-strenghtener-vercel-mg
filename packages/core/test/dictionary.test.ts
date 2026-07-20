import { describe, it, expect } from "vitest";
import { detectDictionary } from "../src/detectors/dictionary.js";

describe("detectDictionary", () => {
  it("detects a top-10k common password", () => {
    const findings = detectDictionary("password");
    expect(
      findings.some((f) => f.category === "top_common_password" && f.severity === "critical")
    ).toBe(true);
  });

  it("detects a dictionary word embedded in a longer string", () => {
    const findings = detectDictionary("xyzcomputer99");
    expect(findings.some((f) => f.category === "dictionary_word")).toBe(true);
  });

  it("detects a common name", () => {
    const findings = detectDictionary("georgi1990");
    expect(
      findings.some(
        (f) => f.category === "common_name" || f.category === "dictionary_word"
      )
    ).toBe(true);
  });

  it("does not flag a random string as dictionary word", () => {
    const findings = detectDictionary("xqzvbkrm");
    expect(findings.find((f) => f.category === "dictionary_word")).toBeUndefined();
  });
});
