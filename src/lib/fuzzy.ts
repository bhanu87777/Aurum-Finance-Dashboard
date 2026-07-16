// Tiny subsequence matcher for the command palette — sufficient for a
// corpus of pages, actions, and a few dozen fetched entities. Higher is
// better; null means no match.
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 0;

  let score = 0;
  let ti = 0;
  let lastMatch = -1;

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    let found = -1;
    for (; ti < t.length; ti++) {
      if (t[ti] === ch) {
        found = ti;
        break;
      }
    }
    if (found === -1) return null;

    // Start-of-word and consecutive-run bonuses; distance penalty.
    if (found === 0 || t[found - 1] === " " || t[found - 1] === "-") score += 8;
    else if (found === lastMatch + 1) score += 4;
    else score += 1;
    score -= Math.min(3, found - lastMatch - 1) * 0.5;

    lastMatch = found;
    ti = found + 1;
  }

  // Prefer shorter targets when the same letters match.
  return score - t.length * 0.05;
}

export function rankMatches<T>(query: string, items: T[], text: (item: T) => string, limit = 8): T[] {
  return items
    .map((item) => ({ item, score: fuzzyScore(query, text(item)) }))
    .filter((r): r is { item: T; score: number } => r.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item);
}
