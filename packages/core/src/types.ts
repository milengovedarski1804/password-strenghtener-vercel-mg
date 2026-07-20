export type Severity = "critical" | "high" | "medium" | "low";

export type FindingCategory =
  | "too_short"
  | "single_char_class"
  | "pure_digits"
  | "date_pattern"
  | "phone_number"
  | "keyboard_pattern"
  | "repeated_chars"
  | "sequence"
  | "leet_substitution"
  | "email_format"
  | "dictionary_word"
  | "common_name"
  | "top_common_password"
  | "composite_pattern"
  | "breached_password";

export interface Finding {
  category: FindingCategory;
  severity: Severity;
  /** Начален и краен индекс в оригиналната парола, за подчертаване в UI */
  matchedRange: [number, number] | null;
  /** Кратко, разбираемо на човешки език обяснение защо това е проблем */
  explanation: string;
  /** По желание: статистика/контекст, напр. "среща се в 4173 известни пробива" */
  detail?: string;
}

export interface AnalysisResult {
  password: string;
  findings: Finding[];
  /** Обобщен резултат 0-100, изчислен от scorer.ts */
  score: number;
  /** Текстов етикет, произлизащ от score */
  label: "много слаба" | "слаба" | "средна" | "силна" | "много силна";
  /** Findings подредени по severity, готови за показване (най-много 3 водещи + останалите свити) */
  topFindings: Finding[];
}
