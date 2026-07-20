import type { Finding } from "../types.js";
import { COMMON_WORDS, COMMON_NAMES, TOP_PASSWORDS } from "../wordlists.js";

const MIN_WORD_LEN = 4;

/** Намира най-дългите поддумички (>= MIN_WORD_LEN) от паролата, срещащи се в дадения речник. */
function findDictionaryMatches(
  password: string,
  dictionary: Set<string>
): Array<[number, number]> {
  const lower = password.toLowerCase();
  const matches: Array<[number, number]> = [];

  for (let start = 0; start < lower.length; start++) {
    let bestEnd = -1;
    for (let end = lower.length; end > start + MIN_WORD_LEN - 1; end--) {
      const candidate = lower.slice(start, end);
      if (dictionary.has(candidate)) {
        bestEnd = end;
        break;
      }
    }
    if (bestEnd !== -1) {
      matches.push([start, bestEnd]);
      start = bestEnd - 1; // прескачаме матчнатата дума
    }
  }
  return matches;
}

function detectDictionaryWord(password: string): Finding[] {
  return findDictionaryMatches(password, COMMON_WORDS).map(([start, end]) => ({
    category: "dictionary_word",
    severity: "medium",
    matchedRange: [start, end],
    explanation: `Фрагментът „${password.slice(
      start,
      end
    )}“ е често срещана дума — речниковите думи са първото нещо, което инструментите за разбиване на пароли пробват.`,
  }));
}

function detectCommonName(password: string): Finding[] {
  return findDictionaryMatches(password, COMMON_NAMES).map(([start, end]) => ({
    category: "common_name",
    severity: "medium",
    matchedRange: [start, end],
    explanation: `Фрагментът „${password.slice(
      start,
      end
    )}“ прилича на често срещано име — имена (собствени, на близки, домашни любимци) са лесни за отгатване или свързване с вас.`,
  }));
}

function detectTopCommonPassword(password: string): Finding[] {
  if (TOP_PASSWORDS.has(password.toLowerCase())) {
    return [
      {
        category: "top_common_password",
        severity: "critical",
        matchedRange: [0, password.length],
        explanation:
          "Тази парола е в списъка на най-често използваните пароли в света — тя буквално е сред първите комбинации, пробвани при всяка атака.",
      },
    ];
  }
  return [];
}

export function detectDictionary(password: string): Finding[] {
  const topCommon = detectTopCommonPassword(password);
  // ако паролата е директно в топ 10к, останалите речникови находки за цялата
  // дума са излишни повторения на същата информация
  if (topCommon.length > 0) return topCommon;

  return [...detectDictionaryWord(password), ...detectCommonName(password)];
}
