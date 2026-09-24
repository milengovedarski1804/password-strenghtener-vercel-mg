/**
 * Разширена оценка на инструмента върху голям набор пароли.
 *
 * Групи:
 *  A. Изтекли пароли извън локалния списък (ранг 10 001 - 100 000 в
 *     xato-net-10-million-passwords, изключени тези в top10k на инструмента).
 *  B. Изтекли, но структурно сложни (от същия диапазон: дължина >= 10 и
 *     поне 3 класа символи) - типът на Tr0ub4dor&3.
 *  C. Случайно генерирани силни пароли (16 символа, всички класове).
 *
 * Сравнение с zxcvbn (Bitwarden използва същия алгоритъм).
 *
 * Пускане:
 *   npx tsx scripts/evaluate.ts            (без HIBP)
 *   npx tsx scripts/evaluate.ts --hibp     (с проверка срещу HIBP, нужен интернет)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import zxcvbn from "zxcvbn";
import { analyzePassword, mergeHibpFinding, checkHibp, hibpFinding } from "../packages/core/src/index.js";

const SAMPLE = 200;
const WITH_HIBP = process.argv.includes("--hibp");

// Детерминиран генератор, за да са резултатите възпроизводими.
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260924);
function sample<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
const classes = (p: string) =>
  [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(p)).length;

const top10k = new Set<string>(
  JSON.parse(readFileSync("packages/core/data/common-passwords-top10k.json", "utf8").replace(/^\uFEFF/, "")).map((s: string) => s.toLowerCase())
);
const all = readFileSync("scripts/data/xato-top-100000.txt", "utf8").split(/\r?\n/).filter(Boolean);
const tail = all.slice(10000).filter((p) => !top10k.has(p.toLowerCase()));

const groupA = sample(tail, SAMPLE);
const groupB = sample(tail.filter((p) => p.length >= 10 && classes(p) >= 3), SAMPLE);
const CH = { l: "abcdefghijklmnopqrstuvwxyz", u: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", d: "0123456789", s: "!@#$%^&*()-_=+[]{};:,.?" };
const pick = (s: string) => s[Math.floor(rand() * s.length)];
const groupC = Array.from({ length: SAMPLE }, () => {
  const all4 = CH.l + CH.u + CH.d + CH.s;
  const chars = [pick(CH.l), pick(CH.u), pick(CH.d), pick(CH.s), ...Array.from({ length: 12 }, () => pick(all4))];
  return sample(chars, chars.length).join("");
});

const WEAK = new Set(["много слаба", "слаба"]);
const STRONG = new Set(["силна", "много силна"]);

interface Row { group: string; password: string; ourScore: number; ourLabel: string; zxcvbn: number; hibp: number | "" }

async function run() {
  const rows: Row[] = [];
  const groups: [string, string[]][] = [["A", groupA], ["B", groupB], ["C", groupC]];
  for (const [g, list] of groups) {
    for (const password of list) {
      let result = analyzePassword(password);
      let hibp: number | "" = "";
      if (WITH_HIBP) {
        try {
          const r = await checkHibp(password);
          hibp = r.count;
          result = mergeHibpFinding(result, hibpFinding(r));
        } catch { hibp = ""; }
        await new Promise((r) => setTimeout(r, 120));
      }
      rows.push({ group: g, password, ourScore: result.score, ourLabel: result.label, zxcvbn: zxcvbn(password).score, hibp });
    }
  }

  mkdirSync("scripts/results", { recursive: true });
  const suffix = WITH_HIBP ? "-hibp" : "";
  const csv = ["group,password,our_score,our_label,zxcvbn_score,hibp_count",
    ...rows.map((r) => [r.group, JSON.stringify(r.password), r.ourScore, r.ourLabel, r.zxcvbn, r.hibp].join(","))].join("\n");
  writeFileSync(`scripts/results/evaluation${suffix}.csv`, csv);

  const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;
  const names: Record<string, string> = {
    A: "A. Изтекли, извън локалния списък",
    B: "B. Изтекли, структурно сложни",
    C: "C. Случайни силни (генерирани)",
  };
  const lines: string[] = [`Разширена оценка (${WITH_HIBP ? "с HIBP" : "без HIBP"}), до ${SAMPLE} пароли в група`, ""];
  for (const g of ["A", "B", "C"]) {
    const rs = rows.filter((r) => r.group === g);
    lines.push(`${names[g]} (n=${rs.length})`);
    lines.push(`  Нашият инструмент - слаба/много слаба: ${pct(rs.filter((r) => WEAK.has(r.ourLabel)).length, rs.length)}, силна/много силна: ${pct(rs.filter((r) => STRONG.has(r.ourLabel)).length, rs.length)}`);
    lines.push(`  zxcvbn - оценка 0-1: ${pct(rs.filter((r) => r.zxcvbn <= 1).length, rs.length)}, оценка 3-4: ${pct(rs.filter((r) => r.zxcvbn >= 3).length, rs.length)}`);
    if (WITH_HIBP) {
      const checked = rs.filter((r) => r.hibp !== "");
      lines.push(`  HIBP - намерени в пробиви: ${pct(checked.filter((r) => (r.hibp as number) > 0).length, checked.length)} (проверени ${checked.length})`);
    }
    lines.push("");
  }
  const summary = lines.join("\n");
  writeFileSync(`scripts/results/summary${suffix}.txt`, summary);
  console.log(summary);
}
run();
