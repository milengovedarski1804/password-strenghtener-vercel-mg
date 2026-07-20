import type { Finding } from "../types.js";

const LOWER = /[a-zа-я]/;
const UPPER = /[A-ZА-Я]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[^a-zA-Zа-яА-Я0-9]/;

export function detectStructural(password: string): Finding[] {
  const findings: Finding[] = [];

  if (password.length < 12) {
    findings.push({
      category: "too_short",
      severity: password.length < 8 ? "high" : "medium",
      matchedRange: [0, password.length],
      explanation:
        password.length < 8
          ? `Паролата е само ${password.length} символа — твърде кратка, за да устои на автоматизирано познаване.`
          : `Паролата е ${password.length} символа — препоръчват се поне 12 за добра защита.`,
    });
  }

  const classesPresent = [LOWER, UPPER, DIGIT, SYMBOL].filter((re) =>
    re.test(password)
  ).length;

  if (password.length > 0 && classesPresent <= 1) {
    findings.push({
      category: "single_char_class",
      severity: "high",
      matchedRange: [0, password.length],
      explanation:
        "Паролата използва само един тип символи (напр. само малки букви или само цифри), което силно намалява броя на възможните комбинации.",
    });
  }

  if (password.length > 0 && DIGIT.test(password) && /^[0-9]+$/.test(password)) {
    findings.push({
      category: "pure_digits",
      severity: "high",
      matchedRange: [0, password.length],
      explanation:
        "Паролата се състои изцяло от цифри — това е един от най-честите типове пароли в реални пробиви на данни.",
    });
  }

  return findings;
}
