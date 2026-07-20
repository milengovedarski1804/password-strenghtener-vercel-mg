import { describe, it, expect } from "vitest";
import { detectPatterns } from "../src/detectors/patterns.js";

describe("detectPatterns", () => {
  it("detects an 8-digit date pattern (DDMMYYYY)", () => {
    const findings = detectPatterns("x25121995x");
    expect(findings.some((f) => f.category === "date_pattern")).toBe(true);
  });

  it("detects a 6-digit date pattern", () => {
    const findings = detectPatterns("x250195x");
    expect(findings.some((f) => f.category === "date_pattern")).toBe(true);
  });

  it("does not flag known false positive 123456 as a date", () => {
    const findings = detectPatterns("123456");
    expect(findings.find((f) => f.category === "date_pattern")).toBeUndefined();
  });

  it("detects a Bulgarian mobile phone number", () => {
    const findings = detectPatterns("call0888123456now");
    expect(findings.some((f) => f.category === "phone_number")).toBe(true);
  });

  it("detects a same-row keyboard pattern", () => {
    const findings = detectPatterns("qwertyui");
    expect(findings.some((f) => f.category === "keyboard_pattern")).toBe(true);
  });

  it("detects a zigzag keyboard pattern", () => {
    const findings = detectPatterns("qazwsx");
    expect(findings.some((f) => f.category === "keyboard_pattern")).toBe(true);
  });

  it("does not flag random non-adjacent letters as keyboard pattern", () => {
    const findings = detectPatterns("mkpqzv");
    expect(findings.find((f) => f.category === "keyboard_pattern")).toBeUndefined();
  });

  it("detects repeated characters", () => {
    const findings = detectPatterns("aaa111bbb");
    expect(findings.filter((f) => f.category === "repeated_chars").length).toBe(3);
  });

  it("detects an ascending sequence", () => {
    const findings = detectPatterns("xabcdx");
    expect(findings.some((f) => f.category === "sequence")).toBe(true);
  });

  it("detects a descending sequence", () => {
    const findings = detectPatterns("x4321x");
    expect(findings.some((f) => f.category === "sequence")).toBe(true);
  });

  it("detects leet substitution of a common word", () => {
    const findings = detectPatterns("p4ssw0rd");
    expect(findings.some((f) => f.category === "leet_substitution")).toBe(true);
  });

  it("does not flag leet substitution when unleet does not form a word", () => {
    const findings = detectPatterns("x4x0x");
    expect(findings.find((f) => f.category === "leet_substitution")).toBeUndefined();
  });

  it("detects email format", () => {
    const findings = detectPatterns("user@example.com");
    expect(findings.some((f) => f.category === "email_format")).toBe(true);
  });

  describe("same physical key, different Shift state", () => {
    it("detects a letter pressed twice with toggled Shift (Qq)", () => {
      const findings = detectPatterns("xQqx");
      expect(
        findings.some(
          (f) => f.category === "keyboard_pattern" && f.matchedRange?.[0] === 1
        )
      ).toBe(true);
    });

    it("detects a digit followed by its Shift symbol on the same key (1!)", () => {
      const findings = detectPatterns("x1!x");
      expect(findings.some((f) => f.category === "keyboard_pattern")).toBe(true);
    });

    it("detects a Shift symbol followed by its digit on the same key (!1)", () => {
      const findings = detectPatterns("x!1x");
      expect(findings.some((f) => f.category === "keyboard_pattern")).toBe(true);
    });

    it("does not flag two identical letters (defers to repeated_chars' own threshold)", () => {
      const findings = detectPatterns("correct");
      expect(
        findings.some(
          (f) => f.category === "keyboard_pattern" && f.matchedRange?.[0] === 2
        )
      ).toBe(false);
    });

    it("does not flag two identical digits pressed without Shift", () => {
      const findings = detectPatterns("x11x");
      expect(findings.find((f) => f.category === "keyboard_pattern")).toBeUndefined();
    });

    it("does not flag unrelated punctuation as same-key", () => {
      const findings = detectPatterns("a?b?c");
      expect(findings.find((f) => f.category === "keyboard_pattern")).toBeUndefined();
    });

    it("treats characters with no keyboard mapping (e.g. space) as run breakers", () => {
      const findings = detectPatterns("Q q");
      expect(findings.find((f) => f.category === "keyboard_pattern")).toBeUndefined();
    });

    it("flags the full 'Qq!!11wW' example: Qq, the merged !!11 (same '1' key, Shift toggled once), and wW", () => {
      const findings = detectPatterns("Qq!!11wW").filter(
        (f) => f.category === "keyboard_pattern"
      );
      expect(findings.map((f) => f.matchedRange)).toEqual([
        [0, 2],
        [2, 6],
        [6, 8],
      ]);
    });
  });
});
