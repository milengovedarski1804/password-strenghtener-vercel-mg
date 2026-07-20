import type { Finding } from "../types.js";

const LOWER = /[a-zа-я]/;
const UPPER = /[A-ZА-Я]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[^a-zA-Zа-яА-Я0-9]/;

function isLongAndComplex(password: string): boolean {
  const classesPresent = [LOWER, UPPER, DIGIT, SYMBOL].filter((re) =>
    re.test(password)
  ).length;
  return password.length >= 16 && classesPresent >= 3;
}

/**
 * Открива композитни модели: комбинация от честа дума/име + дата или телефонен номер.
 * Приема вече изчислените findings от другите детектори, за да не дублира логика.
 *
 * По примера на Xu & Han: НЕ предупреждава за композитни модели, ако паролата вече
 * е достатъчно дълга и сложна структурно — за да не претовари потребителя с
 * излишни съобщения.
 */
export function detectComposite(
  password: string,
  otherFindings: Finding[]
): Finding[] {
  if (isLongAndComplex(password)) return [];

  const wordLike = otherFindings.filter(
    (f) => f.category === "dictionary_word" || f.category === "common_name"
  );
  const contextLike = otherFindings.filter(
    (f) => f.category === "date_pattern" || f.category === "phone_number"
  );

  if (wordLike.length === 0 || contextLike.length === 0) return [];

  const word = wordLike[0];
  const context = contextLike[0];

  const ranges = [word.matchedRange, context.matchedRange].filter(
    (r): r is [number, number] => r !== null
  );
  const start = Math.min(...ranges.map((r) => r[0]));
  const end = Math.max(...ranges.map((r) => r[1]));

  const contextLabel =
    context.category === "date_pattern" ? "дата" : "телефонен номер";

  return [
    {
      category: "composite_pattern",
      severity: "high",
      matchedRange: [start, end],
      explanation: `Паролата комбинира лесно разпознаваема дума/име с ${contextLabel} — тази комбинация е предвидим модел, който атакуващите проверяват специално, дори когато отделните части изглеждат безобидни.`,
    },
  ];
}
