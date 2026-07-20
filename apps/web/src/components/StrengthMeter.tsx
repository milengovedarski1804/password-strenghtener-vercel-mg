import type { AnalysisResult } from "@password-checker/core";

const LABEL_COLOR: Record<AnalysisResult["label"], string> = {
  "много слаба": "var(--critical)",
  слаба: "var(--high)",
  средна: "var(--medium)",
  силна: "#8bc34a",
  "много силна": "var(--low)",
};

interface StrengthMeterProps {
  score: number;
  label: AnalysisResult["label"];
}

export default function StrengthMeter({ score, label }: StrengthMeterProps) {
  const color = LABEL_COLOR[label];
  return (
    <div className="strength-meter">
      <div className="strength-meter__bar-track">
        <div
          className="strength-meter__bar-fill"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <div className="strength-meter__label-row">
        <span className="strength-meter__label" style={{ color }}>
          {label}
        </span>
        <span>{score}/100</span>
      </div>
    </div>
  );
}
