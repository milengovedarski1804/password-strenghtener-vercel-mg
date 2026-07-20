import type { AnalysisResult, Finding } from "./types.js";
import {
  detectStructural,
  detectPatterns,
  detectDictionary,
  detectComposite,
} from "./detectors/index.js";
import { computeScore } from "./scorer.js";
import { sortFindingsBySeverity, selectTopFindings } from "./explain.js";

/**
 * Синхронен анализ на паролата (всички детектори без HIBP, който изисква
 * мрежова заявка). За да включите HIBP резултата, извикайте checkHibp()
 * отделно и добавете hibpFinding() към findings преди showing UI-то, или
 * използвайте analyzePasswordWithHibp.
 */
export function analyzePassword(password: string): AnalysisResult {
  const structural = detectStructural(password);
  const patterns = detectPatterns(password);
  const dictionary = detectDictionary(password);
  const composite = detectComposite(password, [
    ...structural,
    ...patterns,
    ...dictionary,
  ]);

  const findings: Finding[] = [
    ...structural,
    ...patterns,
    ...dictionary,
    ...composite,
  ];

  const sorted = sortFindingsBySeverity(findings);
  const { score, label } = computeScore(findings);

  return {
    password,
    findings: sorted,
    score,
    label,
    topFindings: selectTopFindings(sorted),
  };
}

/**
 * Добавя breached_password finding (ако има такъв) към вече изчислен
 * AnalysisResult и преизчислява score/label/topFindings.
 */
export function mergeHibpFinding(
  result: AnalysisResult,
  hibpFinding: Finding | null
): AnalysisResult {
  if (!hibpFinding) return result;

  const findings = [...result.findings, hibpFinding];
  const sorted = sortFindingsBySeverity(findings);
  const { score, label } = computeScore(findings);

  return {
    ...result,
    findings: sorted,
    score,
    label,
    topFindings: selectTopFindings(sorted),
  };
}
