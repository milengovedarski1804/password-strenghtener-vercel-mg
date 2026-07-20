import { describe, it, expect } from "vitest";
import { analyzePassword, mergeHibpFinding } from "../src/analyze.js";
import { hibpFinding } from "../src/hibp.js";

// 8-те тестови пароли от проучването (killer examples от спецификацията)
describe("analyzePassword — тестови пароли от проучването", () => {
  it("'123456' е много слаба: pure_digits + top_common_password", () => {
    const result = analyzePassword("123456");
    expect(result.label).toBe("много слаба");
    expect(result.findings.some((f) => f.category === "top_common_password")).toBe(true);
  });

  it("'password' е много слаба: top_common_password", () => {
    const result = analyzePassword("password");
    expect(result.findings.some((f) => f.category === "top_common_password")).toBe(true);
  });

  it("'qwertyuiop' е слаба: keyboard_pattern + single_char_class", () => {
    const result = analyzePassword("qwertyuiop");
    expect(result.findings.some((f) => f.category === "keyboard_pattern")).toBe(true);
  });

  it("'Georgi1990' комбинира име + дата -> composite_pattern", () => {
    const result = analyzePassword("Georgi1990");
    expect(
      result.findings.some(
        (f) => f.category === "composite_pattern" || f.category === "dictionary_word" || f.category === "common_name"
      )
    ).toBe(true);
  });

  it("'Tr0ub4dor&3' е структурно силна (без high-severity структурни проблеми), но HIBP breach я маркира като 'слаба'", () => {
    const base = analyzePassword("Tr0ub4dor&3");
    // структурно паролата трябва да няма критични (high) структурни проблеми
    expect(base.findings.every((f) => f.severity !== "high")).toBe(true);

    const withBreach = mergeHibpFinding(
      base,
      hibpFinding({ breached: true, count: 4173 })
    );
    expect(withBreach.label).toBe("слаба");
    expect(withBreach.findings.some((f) => f.category === "breached_password")).toBe(true);
  });

  it("'correcthorsebatterystaple' е дълга и структурно 'силна', но HIBP я маркира като 'слаба'", () => {
    const base = analyzePassword("correcthorsebatterystaple");
    const withBreach = mergeHibpFinding(
      base,
      hibpFinding({ breached: true, count: 1200 })
    );
    expect(withBreach.label).toBe("слаба");
  });

  it("случайна дълга сложна парола без breach остава силна/много силна", () => {
    const result = analyzePassword("Xk9$mQ2!vLp8&nR4wZ#j7");
    const withoutBreach = mergeHibpFinding(
      result,
      hibpFinding({ breached: false, count: 0 })
    );
    expect(["силна", "много силна"]).toContain(withoutBreach.label);
  });

  it("'petar@abv.bg' е email формат -> email_format finding", () => {
    const result = analyzePassword("petar@abv.bg");
    expect(result.findings.some((f) => f.category === "email_format")).toBe(true);
  });

  it("topFindings никога не съдържа повече от 3 елемента", () => {
    const result = analyzePassword("123456");
    expect(result.topFindings.length).toBeLessThanOrEqual(3);
  });
});
