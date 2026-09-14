import "server-only";

/**
 * Compares a customer's profile name against the name on a bank account that
 * paid them (NIBSS transfer metadata) — a plausibility check, not an identity
 * verification. Scores how much of the profile name shows up in the sender
 * name, tolerating reordering, abbreviation and minor spelling differences,
 * so an admin can review the genuine mismatches instead of every deposit.
 *
 * Never treat a low score as proof of fraud, and never auto-block on it —
 * it's a triage signal for a human, not a verdict. See the prototype this
 * was validated against: the "Bank Transfer Name Match" artifact.
 */

const TITLES = new Set([
  "MR", "MRS", "MISS", "MS", "DR", "ENGR", "CHIEF", "ALHAJI", "ALHAJA",
  "MALLAM", "PROF", "BARR", "HON", "PASTOR", "REV",
]);
const SUFFIXES = new Set([
  "LTD", "LIMITED", "ENTERPRISES", "VENTURES", "NIG", "NIGERIA", "GLOBAL",
  "INTL", "INTERNATIONAL", "CO", "COMPANY", "STORES",
]);

export const NAME_MATCH_THRESHOLD = 0.6;

function normalize(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[.,'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !TITLES.has(t) && !SUFFIXES.has(t));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) return 0.85;
  const dist = levenshtein(a, b);
  const ratio = 1 - dist / Math.max(a.length, b.length);
  return ratio >= 0.75 ? ratio : 0;
}

export interface NameMatchResult {
  score: number; // 0–1, share of profile-name tokens found in the sender name
  flagged: boolean; // score < NAME_MATCH_THRESHOLD
}

export function matchNames(profileName: string, senderName: string): NameMatchResult {
  const profileTokens = normalize(profileName);
  const senderTokens = normalize(senderName);
  if (profileTokens.length === 0 || senderTokens.length === 0) {
    return { score: 0, flagged: true };
  }

  const usedSender = new Set<number>();
  let hits = 0;

  for (const pt of profileTokens) {
    let bestIdx = -1;
    let bestScore = 0;
    senderTokens.forEach((st, idx) => {
      if (usedSender.has(idx)) return;
      const sim = tokenSimilarity(pt, st);
      if (sim > bestScore) {
        bestScore = sim;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0) {
      usedSender.add(bestIdx);
      hits += 1;
    }
  }

  const score = hits / profileTokens.length;
  return { score, flagged: score < NAME_MATCH_THRESHOLD };
}
