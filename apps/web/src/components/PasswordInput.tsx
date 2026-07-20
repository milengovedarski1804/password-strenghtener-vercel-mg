import { useState } from "react";
import type { Finding } from "@password-checker/core";
import HighlightedPassword from "./HighlightedPassword.js";

interface PasswordInputProps {
  password: string;
  onChange: (value: string) => void;
  findings: Finding[];
}

export default function PasswordInput({
  password,
  onChange,
  findings,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input">
      <div className="password-input__field-wrap">
        {visible && (
          <div className="password-input__overlay" aria-hidden="true">
            <HighlightedPassword password={password} findings={findings} />
          </div>
        )}
        <input
          className="password-input__field"
          type={visible ? "text" : "password"}
          value={password}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Въведете парола за анализ..."
          autoComplete="new-password"
          spellCheck={false}
          aria-label="Парола за анализ"
        />
        <button
          type="button"
          className="password-input__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
        >
          {visible ? "Скрий" : "Покажи"}
        </button>
      </div>
    </div>
  );
}
