import topPasswords from "../data/common-passwords-top10k.json";
import wordsEn from "../data/common-words-en.json";
import wordsBg from "../data/common-words-bg.json";
import names from "../data/common-names.json";

export const TOP_PASSWORDS: Set<string> = new Set(
  (topPasswords as string[]).map((w) => w.toLowerCase())
);

export const COMMON_WORDS: Set<string> = new Set(
  [...(wordsEn as string[]), ...(wordsBg as string[])].map((w) =>
    w.toLowerCase()
  )
);

export const COMMON_NAMES: Set<string> = new Set(
  (names as string[]).map((w) => w.toLowerCase())
);
