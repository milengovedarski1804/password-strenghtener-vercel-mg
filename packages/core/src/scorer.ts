import type { Finding, AnalysisResult } from "./types.js";

const SEVERITY_WEIGHT: Record<Finding["severity"], number> = {
  critical: 40,
  high: 25,
  medium: 12,
  low: 5,
};

// Намаляващ ефект: всяка следваща находка (подредена по тежест низходящо)
// тежи по-малко, за да не се стигне бързо до неразбираемо ниска стойност
// само защото едно и също нещо е засечено няколко пъти.
const DIMINISHING_FACTORS = [1, 0.7, 0.5, 0.35, 0.25, 0.15];

function computePenalty(findings: Finding[]): number {
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]
  );
  let penalty = 0;
  sorted.forEach((f, i) => {
    const factor =
      DIMINISHING_FACTORS[i] ?? DIMINISHING_FACTORS[DIMINISHING_FACTORS.length - 1];
    penalty += SEVERITY_WEIGHT[f.severity] * factor;
  });
  return penalty;
}

function scoreToLabel(score: number): AnalysisResult["label"] {
  if (score <= 20) return "много слаба";
  if (score <= 40) return "слаба";
  if (score <= 60) return "средна";
  if (score <= 80) return "силна";
  return "много силна";
}

export function computeScore(findings: Finding[]): {
  score: number;
  label: AnalysisResult["label"];
} {
  const penalty = computePenalty(findings);
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  let label = scoreToLabel(score);

  const isBreached = findings.some((f) => f.category === "breached_password");
  if (isBreached) {
    // Ключов диференциращ принцип: реално компрометирана парола никога не
    // може да мине за по-добра от "слаба", независимо от структурния score.
    const capped: AnalysisResult["label"][] = ["много слаба", "слаба"];
    if (!capped.includes(label)) {
      label = "слаба";
    }
  }

  return { score, label };
}
