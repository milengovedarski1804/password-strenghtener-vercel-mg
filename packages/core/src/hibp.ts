import type { Finding } from "./types.js";

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRIES = 1;
const RETRY_BASE_DELAY_MS = 600;
const MAX_RETRY_AFTER_MS = 3000;
// Един ред от отговора: 35 шестнадесетични символа (остатъкът от хеша) и брой.
const LINE_PATTERN = /^[0-9A-F]{35}:\d+$/;

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
 * Вид на неуспеха при проверката. Позволява на интерфейса да покаже
 * конкретна причина, вместо обща грешка.
 *  - network: няма връзка (офлайн, DNS, блокирана заявка)
 *  - timeout: услугата не отговори в рамките на лимита
 *  - rate_limited: HTTP 429, твърде много заявки
 *  - server_error: HTTP 5xx, временна грешка на услугата
 *  - http_error: друг неуспешен HTTP статус (4xx)
 *  - invalid_response: успешен статус, но съдържанието не е в очаквания формат
 */
export type HibpErrorKind =
  | "network"
  | "timeout"
  | "rate_limited"
  | "server_error"
  | "http_error"
  | "invalid_response";

export class HibpError extends Error {
  readonly kind: HibpErrorKind;
  readonly status?: number;

  constructor(kind: HibpErrorKind, message: string, status?: number) {
    super(message);
    this.name = "HibpError";
    this.kind = kind;
    this.status = status;
  }
}

export interface HibpOptions {
  /** Максимално време за една заявка (по подразбиране 5000 ms). */
  timeoutMs?: number;
  /** Брой повторни опити при временни грешки (по подразбиране 1). */
  retries?: number;
  /** Позволява подмяна на fetch при тестове. */
  fetchImpl?: typeof fetch;
  /** Позволява подмяна на изчакването между опитите при тестове. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isRetryable(err: HibpError): boolean {
  return (
    err.kind === "network" ||
    err.kind === "timeout" ||
    err.kind === "rate_limited" ||
    err.kind === "server_error"
  );
}

function retryDelay(err: HibpError, attempt: number, retryAfter: string | null): number {
  if (err.kind === "rate_limited" && retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
    }
  }
  return RETRY_BASE_DELAY_MS * 2 ** attempt;
}

async function requestRange(
  prefix: string,
  timeoutMs: number,
  fetchImpl: typeof fetch
): Promise<{ text: string } | { error: HibpError; retryAfter: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${HIBP_RANGE_URL}${prefix}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      const status = response.status;
      const retryAfter = response.headers?.get?.("Retry-After") ?? null;
      if (status === 429) {
        return { error: new HibpError("rate_limited", `HIBP: твърде много заявки (HTTP ${status})`, status), retryAfter };
      }
      if (status >= 500) {
        return { error: new HibpError("server_error", `HIBP: грешка на услугата (HTTP ${status})`, status), retryAfter };
      }
      return { error: new HibpError("http_error", `HIBP: неочакван отговор (HTTP ${status})`, status), retryAfter };
    }

    return { text: await response.text() };
  } catch (e) {
    if (controller.signal.aborted) {
      return { error: new HibpError("timeout", `HIBP: няма отговор в рамките на ${timeoutMs} ms`), retryAfter: null };
    }
    const reason = e instanceof Error ? e.message : String(e);
    return { error: new HibpError("network", `HIBP: мрежова грешка (${reason})`), retryAfter: null };
  } finally {
    clearTimeout(timer);
  }
}

function parseRange(text: string, suffix: string): HibpResult {
  let validLines = 0;
  for (const raw of text.split("\n")) {
    const line = raw.trim().toUpperCase();
    if (!line) continue;
    if (!LINE_PATTERN.test(line)) continue;
    validLines++;
    const [lineSuffix, countStr] = line.split(":");
    if (lineSuffix === suffix) {
      const count = Number(countStr);
      // Редовете-пълнеж имат брой 0 и не означават реален пробив.
      if (count > 0) return { breached: true, count };
    }
  }
  if (validLines === 0) {
    throw new HibpError("invalid_response", "HIBP: отговорът не съдържа валидни данни");
  }
  return { breached: false, count: 0 };
}

/**
 * Проверява паролата срещу Have I Been Pwned чрез k-anonymity API.
 * Паролата никога не напуска устройството в цялост — изпращат се само
 * първите 5 символа на SHA-1 хеша ѝ; сравнението се прави локално.
 *
 * Надеждност:
 *  - всяка заявка има лимит на времето (timeout);
 *  - при временни грешки (мрежа, timeout, HTTP 429, HTTP 5xx) се прави
 *    повторен опит с нарастващо изчакване, като се спазва Retry-After;
 *  - при неуспех се хвърля HibpError с конкретен вид и HTTP статус,
 *    така че интерфейсът да не показва погрешно „чиста" парола.
 */
export async function checkHibp(password: string, options: HibpOptions = {}): Promise<HibpResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;

  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  let lastError: HibpError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const outcome = await requestRange(prefix, timeoutMs, fetchImpl);
    if ("text" in outcome) {
      return parseRange(outcome.text, suffix);
    }
    lastError = outcome.error;
    if (!isRetryable(outcome.error) || attempt === retries) break;
    await sleep(retryDelay(outcome.error, attempt, outcome.retryAfter));
  }
  throw lastError ?? new HibpError("network", "HIBP: неуспешна проверка");
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
