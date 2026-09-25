import type { AnalysisResult, Finding, FindingCategory, Severity } from "@password-checker/core";

export type Language = "bg" | "en";

export const scoreLabels: Record<Language, Record<AnalysisResult["label"], string>> = {
  bg: { "много слаба": "много слаба", слаба: "слаба", средна: "средна", силна: "силна", "много силна": "много силна" },
  en: { "много слаба": "very weak", слаба: "weak", средна: "fair", силна: "strong", "много силна": "very strong" },
};

export const severityLabels: Record<Language, Record<Severity, string>> = {
  bg: { critical: "критично", high: "високо", medium: "средно", low: "ниско" },
  en: { critical: "critical", high: "high", medium: "medium", low: "low" },
};

export const categoryTitles: Record<Language, Record<FindingCategory, string>> = {
  bg: {
    too_short: "Твърде кратка парола", single_char_class: "Само един тип символи", pure_digits: "Само цифри",
    date_pattern: "Прилича на дата", phone_number: "Прилича на телефонен номер", keyboard_pattern: "Модел от клавиатурата",
    repeated_chars: "Повтарящи се символи", sequence: "Възходяща/низходяща поредица",
    leet_substitution: "Предвидима замяна на символи (leet)", email_format: "Прилича на имейл адрес",
    dictionary_word: "Речникова дума", common_name: "Често срещано име", top_common_password: "Сред най-честите пароли в света",
    composite_pattern: "Комбинация от предвидими елементи", breached_password: "Открита в известни пробиви",
  },
  en: {
    too_short: "Password is too short", single_char_class: "Only one character type", pure_digits: "Digits only",
    date_pattern: "Looks like a date", phone_number: "Looks like a phone number", keyboard_pattern: "Keyboard pattern",
    repeated_chars: "Repeated characters", sequence: "Ascending or descending sequence",
    leet_substitution: "Predictable letter substitutions", email_format: "Looks like an email address",
    dictionary_word: "Dictionary word", common_name: "Common name", top_common_password: "Very common password",
    composite_pattern: "Predictable combination", breached_password: "Found in known breaches",
  },
};

const explanations: Record<FindingCategory, (finding: Finding, password: string) => string> = {
  too_short: (_f, password) => `This password has ${password.length} characters. Use at least 12 characters for better protection.`,
  single_char_class: () => "Using only one type of character makes the password easier to guess.",
  pure_digits: () => "Passwords made entirely of digits are common in breach data.",
  date_pattern: () => "This resembles a date, which may be easy to guess from personal information.",
  phone_number: () => "This resembles a phone number, which may be publicly known or linked to you.",
  keyboard_pattern: () => "Nearby keys and Shift variations form patterns attackers can predict.",
  repeated_chars: () => "Repeated characters add little protection against guessing.",
  sequence: () => "Ascending or descending sequences are predictable.",
  leet_substitution: () => "Replacing letters with similar-looking digits is a common, predictable pattern.",
  email_format: () => "Email addresses are often public and are poor choices for passwords.",
  dictionary_word: () => "Dictionary words are among the first things password-cracking tools try.",
  common_name: () => "Common names are easy to guess or connect to a person.",
  top_common_password: () => "This password is among the most commonly used passwords and is tried early in attacks.",
  composite_pattern: () => "Combining a familiar word or name with a date or phone number is predictable.",
  breached_password: () => "This password appears in known breach data and should not be reused.",
};

export function findingExplanation(finding: Finding, password: string, language: Language): string {
  if (language === "bg") return finding.explanation;
  const text = explanations[finding.category](finding, password);
  const range = finding.matchedRange;
  if (!range || range[0] === 0 && range[1] === password.length) return text;
  return `The fragment “${password.slice(range[0], range[1])}” is affected. ${text}`;
}
