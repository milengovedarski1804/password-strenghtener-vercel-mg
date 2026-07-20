import type { Finding } from "@password-checker/core";

interface HighlightedPasswordProps {
  password: string;
  findings: Finding[];
}

/** Обединява застъпващи се или съседни диапазони, за да не се рисуват вложени <mark>. */
function mergeRanges(ranges: [number, number][]): [number, number][] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

/**
 * Рендира паролата с подчертани проблемните фрагменти (matchedRange).
 * Ползва се като прозрачен overlay върху истинското <input>, за да не се
 * променя реалната позиция на курсора при писане.
 */
export default function HighlightedPassword({
  password,
  findings,
}: HighlightedPasswordProps) {
  const ranges = mergeRanges(
    findings
      .map((f) => f.matchedRange)
      .filter((r): r is [number, number] => r !== null)
  );

  if (ranges.length === 0) {
    return <span>{password}</span>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], i) => {
    if (start > cursor) parts.push(password.slice(cursor, start));
    parts.push(<mark key={i}>{password.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < password.length) parts.push(password.slice(cursor));

  return <>{parts}</>;
}
