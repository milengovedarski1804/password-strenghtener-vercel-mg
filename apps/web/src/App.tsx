import { useEffect, useMemo, useState } from "react";
import {
  analyzePassword,
  mergeHibpFinding,
  checkHibp,
  hibpFinding,
  HibpError,
  type AnalysisResult,
  type HibpErrorKind,
} from "@password-checker/core";
import PasswordInput from "./components/PasswordInput.js";
import StrengthMeter from "./components/StrengthMeter.js";
import FindingCard from "./components/FindingCard.js";
import type { Language } from "./i18n.js";

type HibpStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "done"; breached: boolean; count: number }
  | { state: "error"; kind: HibpErrorKind; status?: number };

const HIBP_DEBOUNCE_MS = 500;

const EXAMPLE_PASSWORDS = [
  "123456",
  "Tr0ub4dor&3",
  "correcthorsebatterystaple",
  "Georgi1990",
];

export default function App() {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem("language") === "en" ? "en" : "bg");
  const [theme, setTheme] = useState<"dark" | "light">(() => localStorage.getItem("theme") === "light" ? "light" : "dark");
  const [password, setPassword] = useState("");
  const [hibpStatus, setHibpStatus] = useState<HibpStatus>({ state: "idle" });
  const [showAll, setShowAll] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("language", language);
  }, [language]);

  const baseResult = useMemo(() => analyzePassword(password), [password]);

  useEffect(() => {
    setShowAll(false);

    if (password.length === 0) {
      setHibpStatus({ state: "idle" });
      return;
    }

    setHibpStatus({ state: "loading" });
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const result = await checkHibp(password);
        if (!cancelled) {
          setHibpStatus({
            state: "done",
            breached: result.breached,
            count: result.count,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setHibpStatus(
            e instanceof HibpError
              ? { state: "error", kind: e.kind, status: e.status }
              : { state: "error", kind: "network" }
          );
        }
      }
    }, HIBP_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [password, retryKey]);

  const result: AnalysisResult = useMemo(() => {
    if (hibpStatus.state !== "done") return baseResult;
    const finding = hibpFinding({
      breached: hibpStatus.breached,
      count: hibpStatus.count,
    });
    return mergeHibpFinding(baseResult, finding);
  }, [baseResult, hibpStatus]);

  const visibleFindings = showAll ? result.findings : result.topFindings;
  const hasMore = result.findings.length > result.topFindings.length;

  return (
    <div className="app">
      <div className="app__controls">
        <button type="button" onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")}
          aria-label={language === "bg" ? "Смени темата" : "Switch theme"}>
          {theme === "dark" ? (language === "bg" ? "☀ Светла тема" : "☀ Light theme") : (language === "bg" ? "☾ Тъмна тема" : "☾ Dark theme")}
        </button>
        <button type="button" onClick={() => setLanguage((value) => value === "bg" ? "en" : "bg")}
          aria-label={language === "bg" ? "Switch to English" : "Превключи на български"}>
          {language === "bg" ? "English" : "Български"}
        </button>
      </div>
      <h1 className="app__title">Explainable Password Strength Checker</h1>
      <p className="app__subtitle">
        {language === "bg" ? "Оценка на силата на паролата с приоритизиран, обяснен доклад — не само число, а конкретно кой фрагмент е проблем и защо. Паролата никога не напуска устройството ви в цялост." : "Password strength with a prioritized, explained report: which part is a problem and why. Your full password stays on your device."}
      </p>

      <PasswordInput
        password={password}
        onChange={setPassword}
        findings={result.findings}
        language={language}
      />

      {password.length === 0 && (
        <div className="examples">
          <span className="examples__label">{language === "bg" ? "Пробвайте например:" : "Try an example:"}</span>
          {EXAMPLE_PASSWORDS.map((ex) => (
            <button
              key={ex}
              type="button"
              className="examples__chip"
              onClick={() => setPassword(ex)}
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {password.length > 0 && (
        <>
          <StrengthMeter score={result.score} label={result.label} language={language} />

          <HibpBanner status={hibpStatus} language={language} onRetry={() => setRetryKey((k) => k + 1)} />

          <div className="findings">
            <div className="findings__heading">
              {language === "bg" ? "Открити проблеми" : "Issues found"}{result.findings.length > 0 ? ` (${result.findings.length})` : ""}
            </div>

            {result.findings.length === 0 ? (
              <div className="findings__empty">
                {language === "bg" ? "Не открихме известни структурни или речникови проблеми в тази парола." : "No known structural or dictionary problems were found in this password."}
              </div>
            ) : (
              <>
                {visibleFindings.map((f, i) => (
                  <FindingCard key={`${f.category}-${i}`} finding={f} password={password} language={language} />
                ))}
                {hasMore && (
                  <button
                    type="button"
                    className="findings__toggle-more"
                    onClick={() => setShowAll((s) => !s)}
                  >
                    {showAll ? (language === "bg" ? "Покажи по-малко" : "Show fewer") : (language === "bg" ? `Покажи още ${result.findings.length - result.topFindings.length}` : `Show ${result.findings.length - result.topFindings.length} more`)}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      <footer className="app__footer">
        <p>
          {language === "bg" ? "🔒 Анализът се изпълнява изцяло във вашия браузър. Към Have I Been Pwned се изпраща само 5-символен префикс на SHA-1 хеша на паролата — самата парола никога не напуска устройството ви." : "🔒 Analysis runs in your browser. Only the first five characters of the password's SHA-1 hash are sent to Have I Been Pwned; the full password never leaves your device."}
        </p>
        <a
          className="app__download-link"
          href="https://github.com/milengovedarski1804/password-strenghtener-vercel-mg/releases/tag/v1.0.0"
          target="_blank"
          rel="noopener noreferrer"
        >
          {language === "bg" ? "⬇ Изтегли desktop версията (Windows, portable, работи offline)" : "⬇ Download the desktop version (Windows, portable, works offline)"}
        </a>
      </footer>
    </div>
  );
}

const HIBP_ERROR_TEXT: Record<HibpErrorKind, string> = {
  network: "Няма връзка с услугата Have I Been Pwned (вероятно няма интернет).",
  timeout: "Услугата Have I Been Pwned не отговори навреме.",
  rate_limited: "Услугата Have I Been Pwned временно ограничава заявките.",
  server_error: "Услугата Have I Been Pwned временно не е достъпна.",
  http_error: "Услугата Have I Been Pwned върна неочакван отговор.",
  invalid_response: "Отговорът от Have I Been Pwned не е в очаквания формат.",
};
const HIBP_ERROR_TEXT_EN: Record<HibpErrorKind, string> = {
  network: "Cannot connect to Have I Been Pwned.",
  timeout: "Have I Been Pwned did not respond in time.",
  rate_limited: "Have I Been Pwned is temporarily limiting requests.",
  server_error: "Have I Been Pwned is temporarily unavailable.",
  http_error: "Have I Been Pwned returned an unexpected HTTP response.",
  invalid_response: "Have I Been Pwned returned data in an unexpected format.",
};

function HibpBanner({ status, language, onRetry }: { status: HibpStatus; language: Language; onRetry: () => void }) {
  if (status.state === "idle") return null;

  if (status.state === "loading") {
    return (
      <div className="hibp-banner hibp-banner--loading">
        {language === "bg" ? "Проверка срещу известни пробиви на данни (Have I Been Pwned)..." : "Checking known breaches with Have I Been Pwned..."}
      </div>
    );
  }

  if (status.state === "error") {
    return (
      <div className="hibp-banner hibp-banner--error">
        {(language === "bg" ? HIBP_ERROR_TEXT : HIBP_ERROR_TEXT_EN)[status.kind]}
        {status.status ? ` (HTTP ${status.status})` : ""} {language === "bg" ? "Проверката за пробиви не е извършена - останалият анализ е пълен." : "The breach check was not completed; the other analysis is complete."}{" "}
        <button type="button" className="hibp-retry" onClick={onRetry}>
          {language === "bg" ? "Опитай отново" : "Try again"}
        </button>
      </div>
    );
  }

  if (status.breached) {
    return (
      <div className="hibp-banner hibp-banner--breached">
        {language === "bg" ? `⚠ Намерена в известни пробиви ${status.count.toLocaleString("bg-BG")} пъти (Have I Been Pwned).` : `⚠ Found ${status.count.toLocaleString("en-US")} times in known breaches (Have I Been Pwned).`}
      </div>
    );
  }

  return (
    <div className="hibp-banner hibp-banner--clean">
      {language === "bg" ? "✓ Не е открита в известните пробиви, проверени от Have I Been Pwned." : "✓ Not found in the known breaches checked by Have I Been Pwned."}
    </div>
  );
}
