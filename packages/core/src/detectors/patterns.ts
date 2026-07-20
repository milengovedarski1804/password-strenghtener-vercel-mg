import type { Finding } from "../types.js";
import { COMMON_WORDS } from "../wordlists.js";

// --- date_pattern -----------------------------------------------------

// Известни числени последователности, които изглеждат като дата, но не са
// (за да не вдигаме фалшив аларм за неща като 123456 срещани на друго място).
const DATE_FALSE_POSITIVES = new Set(["123456", "000000", "111111", "123123"]);

function isPlausibleDay(n: number): boolean {
  return n >= 1 && n <= 31;
}
function isPlausibleMonth(n: number): boolean {
  return n >= 1 && n <= 12;
}

function findDateMatches(password: string): Array<[number, number]> {
  const matches: Array<[number, number]> = [];

  // 8-цифрени: YYYYMMDD, DDMMYYYY, MMDDYYYY
  const re8 = /\d{8}/g;
  let m: RegExpExecArray | null;
  while ((m = re8.exec(password))) {
    const s = m[0];
    if (DATE_FALSE_POSITIVES.has(s)) continue;
    const yyyymmdd = { y: s.slice(0, 4), mo: +s.slice(4, 6), d: +s.slice(6, 8) };
    const ddmmyyyy = { d: +s.slice(0, 2), mo: +s.slice(2, 4), y: s.slice(4, 8) };
    const mmddyyyy = { mo: +s.slice(0, 2), d: +s.slice(2, 4), y: s.slice(4, 8) };
    const yearOk = (y: string) => +y >= 1930 && +y <= 2035;
    if (
      (yearOk(yyyymmdd.y) && isPlausibleMonth(yyyymmdd.mo) && isPlausibleDay(yyyymmdd.d)) ||
      (yearOk(ddmmyyyy.y) && isPlausibleMonth(ddmmyyyy.mo) && isPlausibleDay(ddmmyyyy.d)) ||
      (yearOk(mmddyyyy.y) && isPlausibleMonth(mmddyyyy.mo) && isPlausibleDay(mmddyyyy.d))
    ) {
      matches.push([m.index, m.index + s.length]);
    }
  }

  // 6-цифрени: YYMMDD, MMDDYY, DDMMYY
  const re6 = /\d{6}/g;
  while ((m = re6.exec(password))) {
    const s = m[0];
    if (DATE_FALSE_POSITIVES.has(s)) continue;
    // избягваме припокриване с вече намерен 8-цифрен match
    if (matches.some(([a, b]) => m!.index >= a && m!.index < b)) continue;

    const yymmdd = { mo: +s.slice(2, 4), d: +s.slice(4, 6) };
    const mmddyy = { mo: +s.slice(0, 2), d: +s.slice(2, 4) };
    const ddmmyy = { d: +s.slice(0, 2), mo: +s.slice(2, 4) };

    if (
      (isPlausibleMonth(yymmdd.mo) && isPlausibleDay(yymmdd.d)) ||
      (isPlausibleMonth(mmddyy.mo) && isPlausibleDay(mmddyy.d)) ||
      (isPlausibleMonth(ddmmyy.mo) && isPlausibleDay(ddmmyy.d))
    ) {
      matches.push([m.index, m.index + s.length]);
    }
  }

  return matches;
}

function detectDatePattern(password: string): Finding[] {
  const matches = findDateMatches(password);
  return matches.map(([start, end]) => ({
    category: "date_pattern",
    severity: "medium",
    matchedRange: [start, end],
    explanation:
      "Този фрагмент прилича на дата (напр. рожден ден или годишнина) — датите са лесни за отгатване, особено ако са свързани с публично известна информация за вас.",
  }));
}

// --- phone_number -------------------------------------------------------

const PHONE_REGEXES = [
  /(?:\+359|00359|0)8[7-9]\d{7}/g, // БГ мобилни номера
  /(?<!\d)\d{10,11}(?!\d)/g, // общ 10-11 цифрен номер
];

function detectPhoneNumber(password: string): Finding[] {
  const found: Array<[number, number]> = [];
  for (const re of PHONE_REGEXES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(password))) {
      const range: [number, number] = [m.index, m.index + m[0].length];
      if (!found.some(([a, b]) => range[0] >= a && range[1] <= b)) {
        found.push(range);
      }
    }
  }
  return found.map(([start, end]) => ({
    category: "phone_number",
    severity: "medium",
    matchedRange: [start, end],
    explanation:
      "Този фрагмент прилича на телефонен номер — телефонните номера често са публично известни или лесни за свързване с конкретен човек.",
  }));
}

// --- keyboard_pattern -----------------------------------------------------

const ROWS = ["`1234567890-=", "qwertyuiop[]", "asdfghjkl;'", "zxcvbnm,./"];

const adjacency = new Map<string, Set<string>>();
for (const row of ROWS) {
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    const neighbors = new Set<string>();
    if (i > 0) neighbors.add(row[i - 1]);
    if (i < row.length - 1) neighbors.add(row[i + 1]);
    adjacency.set(ch, neighbors);
  }
}
// zigzag съседи (горе-долу-ляво-дясно диагонално), приблизителна QWERTY подредба
const ZIGZAG_NEIGHBORS: Record<string, string[]> = {
  q: ["a", "w"], w: ["q", "s", "e"], e: ["w", "d", "r"], r: ["e", "f", "t"],
  t: ["r", "g", "y"], y: ["t", "h", "u"], u: ["y", "j", "i"], i: ["u", "k", "o"],
  o: ["i", "l", "p"], p: ["o", ";"],
  a: ["q", "z", "s"], s: ["a", "w", "x", "d"], d: ["s", "e", "c", "f"],
  f: ["d", "r", "v", "g"], g: ["f", "t", "b", "h"], h: ["g", "y", "n", "j"],
  j: ["h", "u", "m", "k"], k: ["j", "i", "l"], l: ["k", "o"],
  z: ["a", "s", "x"], x: ["z", "s", "d", "c"], c: ["x", "d", "f", "v"],
  v: ["c", "f", "g", "b"], b: ["v", "g", "h", "n"], n: ["b", "h", "j", "m"],
  m: ["n", "j"],
};

function detectKeyboardPattern(password: string): Finding[] {
  const lower = password.toLowerCase();
  const findings: Finding[] = [];

  let runStart = 0;
  let runType: "row" | "zigzag" | null = null;
  let runLen = 1;

  const flush = (endExclusive: number) => {
    if (runType && runLen >= 3) {
      findings.push({
        category: "keyboard_pattern",
        severity: "high",
        matchedRange: [runStart, endExclusive],
        explanation:
          runType === "row"
            ? "Тази последователност следва съседни клавиши на клавиатурата (напр. „qwerty“) и е сред първите комбинации, пробвани от инструменти за разбиване на пароли."
            : "Тази последователност следва зигзагообразен модел на клавиатурата (напр. „qazwsx“), който е предвидим и лесно се разпознава автоматично.",
      });
    }
  };

  for (let i = 1; i < lower.length; i++) {
    const prev = lower[i - 1];
    const cur = lower[i];
    const isRow = adjacency.get(prev)?.has(cur) ?? false;
    const isZigzag = !isRow && (ZIGZAG_NEIGHBORS[prev]?.includes(cur) ?? false);
    const stepType: "row" | "zigzag" | null = isRow ? "row" : isZigzag ? "zigzag" : null;

    if (stepType !== null && stepType === runType) {
      runLen++;
    } else {
      flush(i);
      runType = stepType;
      runStart = i - 1;
      runLen = stepType ? 2 : 1;
    }
  }
  flush(lower.length);

  return [...findings, ...detectSameKeyPattern(password)];
}

// Съседни символи, произлизащи от един и същ физически клавиш: буква +
// Shift-вариант на същата буква (Qq), или цифра/символ + неговия Shift
// партньор на същия клавиш (1!, 2@, ...). Регистровите двойки се губят,
// ако се сравнява само по lower-case низ — затова тази проверка работи
// върху оригиналния password, не върху lower(password).
const SHIFT_PAIRS: Record<string, string> = {
  "1": "!", "2": "@", "3": "#", "4": "$", "5": "%",
  "6": "^", "7": "&", "8": "*", "9": "(", "0": ")",
  "-": "_", "=": "+", "`": "~", "[": "{", "]": "}",
  "\\": "|", ";": ":", "'": '"', ",": "<", ".": ">", "/": "?",
};
const SYMBOL_TO_DIGIT: Record<string, string> = Object.fromEntries(
  Object.entries(SHIFT_PAIRS).map(([digit, symbol]) => [symbol, digit])
);

function physicalKey(ch: string): string | null {
  if (/[a-zA-Z]/.test(ch)) return ch.toLowerCase();
  if (ch in SHIFT_PAIRS) return ch;
  if (ch in SYMBOL_TO_DIGIT) return SYMBOL_TO_DIGIT[ch];
  return null;
}

function detectSameKeyPattern(password: string): Finding[] {
  const findings: Finding[] = [];
  let i = 0;
  while (i < password.length) {
    let j = i;
    const key = physicalKey(password[i]);
    if (key !== null) {
      while (j + 1 < password.length && physicalKey(password[j + 1]) === key) j++;
    }
    const runLength = j - i + 1;
    if (key !== null && runLength >= 2) {
      const isAllIdentical = password.slice(i, j + 1).split("").every((c) => c === password[i]);
      // Напълно еднакви поредици (напр. "rr" в обикновена дума) умишлено се
      // оставят на repeated_chars и прага му от 3+ — това не е keyboard-mashing
      // модел, а нормална ортография. Тук хващаме само случаите, в които
      // символите различават (Shift toggle: Qq, wW, 1!, !1...), защото само
      // те издават реално "същия клавиш, натиснат с/без Shift" модел.
      if (!isAllIdentical) {
        findings.push({
          category: "keyboard_pattern",
          severity: "high",
          matchedRange: [i, j + 1],
          explanation: `Фрагментът „${password.slice(i, j + 1)}“ се получава от един и същ физически клавиш, натиснат последователно с и без Shift — това е също толкова предвидимо, колкото съседни клавиши на реда.`,
        });
      }
    }
    i = j + 1;
  }
  return findings;
}

// --- repeated_chars ---------------------------------------------------

function detectRepeatedChars(password: string): Finding[] {
  const findings: Finding[] = [];
  let i = 0;
  while (i < password.length) {
    let j = i;
    while (j + 1 < password.length && password[j + 1] === password[i]) j++;
    const runLength = j - i + 1;
    if (runLength >= 3) {
      findings.push({
        category: "repeated_chars",
        severity: "medium",
        matchedRange: [i, j + 1],
        explanation: `Символът „${password[i]}“ се повтаря ${runLength} пъти подред — повтарящите се символи почти не добавят реална сложност.`,
      });
    }
    i = j + 1;
  }
  return findings;
}

// --- sequence -----------------------------------------------------------

function detectSequence(password: string): Finding[] {
  const findings: Finding[] = [];
  let i = 0;
  while (i < password.length - 1) {
    const startCode = password.charCodeAt(i);
    const nextCode = password.charCodeAt(i + 1);
    const diff = nextCode - startCode;
    if (diff === 1 || diff === -1) {
      let j = i + 1;
      while (
        j < password.length - 1 &&
        password.charCodeAt(j + 1) - password.charCodeAt(j) === diff
      ) {
        j++;
      }
      const runLength = j - i + 1;
      if (runLength >= 3) {
        findings.push({
          category: "sequence",
          severity: "medium",
          matchedRange: [i, j + 1],
          explanation: `Фрагментът „${password.slice(i, j + 1)}“ е ${
            diff === 1 ? "възходяща" : "низходяща"
          } поредица от символи — лесно предвидима и сред първите неща, пробвани при разбиване на пароли.`,
        });
        i = j + 1;
        continue;
      }
    }
    i++;
  }
  return findings;
}

// --- leet_substitution ----------------------------------------------------

const LEET_MAP: Record<string, string> = {
  "3": "e",
  "0": "o",
  "@": "a",
  "4": "a",
  "1": "i",
  "!": "i",
  $: "s",
  "5": "s",
  "7": "t",
};

function unleet(password: string): string {
  return password
    .toLowerCase()
    .split("")
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join("");
}

function detectLeetSubstitution(password: string): Finding[] {
  const original = password.toLowerCase();
  const hasLeetChar = original.split("").some((ch) => ch in LEET_MAP);
  if (!hasLeetChar) return [];

  const unleeted = unleet(password);
  if (unleeted === original) return [];

  if (COMMON_WORDS.has(unleeted) || COMMON_WORDS.has(unleeted.replace(/[^a-zа-я]/g, ""))) {
    return [
      {
        category: "leet_substitution",
        severity: "medium",
        matchedRange: [0, password.length],
        explanation: `Замяната на букви с цифри тук е предвидима (напр. „${password}“ → „${unleeted}“) и не добавя реална сигурност — инструментите за разбиване на пароли пробват тези замествания автоматично.`,
      },
    ];
  }
  return [];
}

// --- email_format -----------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

function detectEmailFormat(password: string): Finding[] {
  if (EMAIL_REGEX.test(password)) {
    return [
      {
        category: "email_format",
        severity: "medium",
        matchedRange: [0, password.length],
        explanation:
          "Паролата изглежда като имейл адрес — имейл адресите често са публично известни, което ги прави лош избор за парола.",
      },
    ];
  }
  return [];
}

export function detectPatterns(password: string): Finding[] {
  return [
    ...detectDatePattern(password),
    ...detectPhoneNumber(password),
    ...detectKeyboardPattern(password),
    ...detectRepeatedChars(password),
    ...detectSequence(password),
    ...detectLeetSubstitution(password),
    ...detectEmailFormat(password),
  ];
}
