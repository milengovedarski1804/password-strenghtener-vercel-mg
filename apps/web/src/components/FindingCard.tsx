import { useState } from "react";
import type { Finding, FindingCategory } from "@password-checker/core";

const SEVERITY_COLOR: Record<Finding["severity"], string> = {
  critical: "var(--critical)",
  high: "var(--high)",
  medium: "var(--medium)",
  low: "var(--low)",
};

const SEVERITY_ICON: Record<Finding["severity"], string> = {
  critical: "⛔",
  high: "⚠",
  medium: "◐",
  low: "ℹ",
};

const SEVERITY_LABEL: Record<Finding["severity"], string> = {
  critical: "критично",
  high: "високо",
  medium: "средно",
  low: "ниско",
};

const CATEGORY_TITLE: Record<FindingCategory, string> = {
  too_short: "Твърде кратка парола",
  single_char_class: "Само един тип символи",
  pure_digits: "Само цифри",
  date_pattern: "Прилича на дата",
  phone_number: "Прилича на телефонен номер",
  keyboard_pattern: "Модел от клавиатурата",
  repeated_chars: "Повтарящи се символи",
  sequence: "Възходяща/низходяща поредица",
  leet_substitution: "Предвидима замяна на символи (leet)",
  email_format: "Прилича на имейл адрес",
  dictionary_word: "Речникова дума",
  common_name: "Често срещано име",
  top_common_password: "Сред най-честите пароли в света",
  composite_pattern: "Комбинация от предвидими елементи",
  breached_password: "Открита в известни пробиви",
};

interface FindingCardProps {
  finding: Finding;
}

export default function FindingCard({ finding }: FindingCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="finding-card">
      <button
        type="button"
        className="finding-card__header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span
          className="finding-card__severity-icon"
          style={{ color: SEVERITY_COLOR[finding.severity] }}
          title={`Тежест: ${SEVERITY_LABEL[finding.severity]}`}
        >
          {SEVERITY_ICON[finding.severity]}
        </span>
        <span className="finding-card__title">
          {CATEGORY_TITLE[finding.category]}
        </span>
        <span
          className="finding-card__severity-badge"
          style={{
            color: SEVERITY_COLOR[finding.severity],
            borderColor: SEVERITY_COLOR[finding.severity],
          }}
        >
          {SEVERITY_LABEL[finding.severity]}
        </span>
        <span
          className={`finding-card__chevron${open ? " finding-card__chevron--open" : ""}`}
        >
          ▶
        </span>
      </button>
      {open && (
        <div className="finding-card__body">
          <p>{finding.explanation}</p>
          {finding.detail && (
            <p className="finding-card__detail">{finding.detail}</p>
          )}
        </div>
      )}
    </div>
  );
}
