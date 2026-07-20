import type { Finding } from "./types.js";

const SEVERITY_ORDER: Record<Finding["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const MAX_TOP_FINDINGS = 3;

/**
 * Подрежда findings по severity (низходящо) и връща водещите — по примера на
 * Ur et al., за да не се претовари потребителят с прекалено много съобщения
 * наведнъж. Останалите findings остават в пълния списък, достъпни зад
 * "покажи повече" в UI-то.
 */
export function sortFindingsBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
}

export function selectTopFindings(sortedFindings: Finding[]): Finding[] {
  return sortedFindings.slice(0, MAX_TOP_FINDINGS);
}
