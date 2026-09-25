import { useState } from "react";
import type { Finding } from "@password-checker/core";
import { categoryTitles, findingExplanation, severityLabels, type Language } from "../i18n.js";

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

interface FindingCardProps {
  finding: Finding;
  password: string;
  language: Language;
}

export default function FindingCard({ finding, password, language }: FindingCardProps) {
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
          title={`${language === "bg" ? "Тежест" : "Severity"}: ${severityLabels[language][finding.severity]}`}
        >
          {SEVERITY_ICON[finding.severity]}
        </span>
        <span className="finding-card__title">
          {categoryTitles[language][finding.category]}
        </span>
        <span
          className="finding-card__severity-badge"
          style={{
            color: SEVERITY_COLOR[finding.severity],
            borderColor: SEVERITY_COLOR[finding.severity],
          }}
        >
          {severityLabels[language][finding.severity]}
        </span>
        <span
          className={`finding-card__chevron${open ? " finding-card__chevron--open" : ""}`}
        >
          ▶
        </span>
      </button>
      {open && (
        <div className="finding-card__body">
          <p>{findingExplanation(finding, password, language)}</p>
          {finding.detail && language === "bg" && (
            <p className="finding-card__detail">{finding.detail}</p>
          )}
        </div>
      )}
    </div>
  );
}
