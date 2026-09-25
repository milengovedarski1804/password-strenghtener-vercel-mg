import { useRef, useState } from "react";
import type { Finding } from "@password-checker/core";
import HighlightedPassword from "./HighlightedPassword.js";
import type { Language } from "../i18n.js";

interface PasswordInputProps {
  password: string;
  onChange: (value: string) => void;
  findings: Finding[];
  language: Language;
}

export default function PasswordInput({
  password,
  onChange,
  findings,
  language,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function clearPassword() {
    onChange("");
    setVisible(false);
    inputRef.current?.focus();
  }

  return (
    <div className="password-input">
      <div className="password-input__field-wrap">
        {visible && (
          <div className="password-input__overlay" aria-hidden="true">
            <HighlightedPassword password={password} findings={findings} />
          </div>
        )}
        <input
          ref={inputRef}
          className="password-input__field"
          type={visible ? "text" : "password"}
          value={password}
          onChange={(e) => onChange(e.target.value)}
          placeholder={language === "bg" ? "Въведете парола за анализ..." : "Enter a password to analyze..."}
          autoComplete="new-password"
          spellCheck={false}
          aria-label={language === "bg" ? "Парола за анализ" : "Password to analyze"}
        />
        {password.length > 0 && (
          <button
            type="button"
            className="password-input__clear"
            onClick={clearPassword}
            aria-label={language === "bg" ? "Изчисти паролата и резултата" : "Clear password and result"}
          >
            {language === "bg" ? "Изчисти" : "Clear"}
          </button>
        )}
        <button
          type="button"
          className="password-input__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
        >
          {language === "bg" ? (visible ? "Скрий" : "Покажи") : (visible ? "Hide" : "Show")}
        </button>
      </div>
    </div>
  );
}
