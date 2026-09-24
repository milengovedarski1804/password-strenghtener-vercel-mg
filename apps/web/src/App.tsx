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
  const [password, setPassword] = useState("");
  const [hibpStatus, setHibpStatus] = useState<HibpStatus>({ state: "idle" });
  const [showAll, setShowAll] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

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
      <h1 className="app__title">Explainable Password Strength Checker</h1>
      <p className="app__subtitle">
        Оценка на силата на паролата с приоритизиран, обяснен доклад — не само
        число, а конкретно кой фрагмент е проблем и защо. Паролата никога не
        напуска устройството ви в цялост.
      </p>

      <PasswordInput
        password={password}
        onChange={setPassword}
        findings={result.findings}
      />

      {password.length === 0 && (
        <div className="examples">
          <span className="examples__label">Пробвайте например:</span>
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
          <StrengthMeter score={result.score} label={result.label} />

          <HibpBanner status={hibpStatus} onRetry={() => setRetryKey((k) => k + 1)} />

          <div className="findings">
            <div className="findings__heading">
              {result.findings.length === 0
                ? "Открити проблеми"
                : `Открити проблеми (${result.findings.length})`}
            </div>

            {result.findings.length === 0 ? (
              <div className="findings__empty">
                Не открихме известни структурни или речникови проблеми в тази
                парола.
              </div>
            ) : (
              <>
                {visibleFindings.map((f, i) => (
                  <FindingCard key={`${f.category}-${i}`} finding={f} />
                ))}
                {hasMore && (
                  <button
                    type="button"
                    className="findings__toggle-more"
                    onClick={() => setShowAll((s) => !s)}
                  >
                    {showAll
                      ? "Покажи по-малко"
                      : `Покажи още ${result.findings.length - result.topFindings.length}`}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      <footer className="app__footer">
        <p>
          🔒 Анализът се изпълнява изцяло във вашия браузър. Към Have I Been
          Pwned се изпраща само 5-символен префикс на SHA-1 хеша на паролата —
          самата парола никога не напуска устройството ви.
        </p>
        <a
          className="app__download-link"
          href="https://github.com/milengovedarski1804/password-strenghtener-vercel-mg/releases/tag/v1.0.0"
          target="_blank"
          rel="noopener noreferrer"
        >
          ⬇ Изтегли desktop версията (Windows, portable, работи offline)
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

function HibpBanner({ status, onRetry }: { status: HibpStatus; onRetry: () => void }) {
  if (status.state === "idle") return null;

  if (status.state === "loading") {
    return (
      <div className="hibp-banner hibp-banner--loading">
        Проверка срещу известни пробиви на данни (Have I Been Pwned)...
      </div>
    );
  }

  if (status.state === "error") {
    return (
      <div className="hibp-banner hibp-banner--error">
        {HIBP_ERROR_TEXT[status.kind]}
        {status.status ? ` (HTTP ${status.status})` : ""} Проверката за пробиви
        не е извършена - останалият анализ е пълен.{" "}
        <button type="button" className="hibp-retry" onClick={onRetry}>
          Опитай отново
        </button>
      </div>
    );
  }

  if (status.breached) {
    return (
      <div className="hibp-banner hibp-banner--breached">
        ⚠ Намерена в известни пробиви {status.count.toLocaleString("bg-BG")}{" "}
        пъти (Have I Been Pwned).
      </div>
    );
  }

  return (
    <div className="hibp-banner hibp-banner--clean">
      ✓ Не е открита в известните пробиви, проверени от Have I Been Pwned.
    </div>
  );
}
