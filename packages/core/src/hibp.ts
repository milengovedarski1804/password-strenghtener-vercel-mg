import type { Finding } from "./types.js";

async function sha1Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export interface HibpResult {
  breached: boolean;
  count: number;
}

/**
 * Проверява паролата срещу Have I Been Pwned чрез k-anonymity API.
 * Паролата никога не напуска устройството в цялост — изпращат се само
 * първите 5 символа на SHA-1 хеша ѝ.
 *
 * При мрежова грешка (напр. offline десктоп режим) хвърля грешка —
 * извикващият код трябва да я обработи грациозно и да продължи без тази находка.
 */
export async function checkHibp(password: string): Promise<HibpResult> {
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  if (!response.ok) {
    throw new Error(`HIBP request failed with status ${response.status}`);
  }
  const text = await response.text();

  for (const line of text.split("\n")) {
    const [lineSuffix, countStr] = line.trim().split(":");
    if (lineSuffix === suffix) {
      return { breached: true, count: Number(countStr) || 0 };
    }
  }
  return { breached: false, count: 0 };
}

export function hibpFinding(result: HibpResult): Finding | null {
  if (!result.breached) return null;
  return {
    category: "breached_password",
    severity: "critical",
    matchedRange: null,
    explanation:
      "Тази парола е открита в известни пробиви на данни — дори да изглежда структурно сложна, тя вече е позната на атакуващите и не трябва да се използва.",
    detail: `Намерена в известни пробиви ${result.count.toLocaleString("bg-BG")} пъти.`,
  };
}
