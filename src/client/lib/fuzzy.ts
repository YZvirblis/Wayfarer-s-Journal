/**
 * Small fuzzy matcher for the command palette. A substring match scores highest
 * (earlier and at a word start is better); otherwise every query character must
 * appear in order, with bonuses for runs and word starts. Returns null when the
 * text does not match at all.
 */
const WORD_BOUNDARY = /[\s\-_'’.,:;()[\]/]/;

export function fuzzyScore(query: string, text: string): number | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return 0;
  const haystack = text.toLowerCase();

  const at = haystack.indexOf(needle);
  if (at !== -1) {
    const wordStart = at === 0 || WORD_BOUNDARY.test(haystack.charAt(at - 1));
    return 100 + (wordStart ? 20 : 0) - at * 0.5 - haystack.length * 0.02;
  }

  let score = 0;
  let from = 0;
  let previous = -2;
  let first = -1;
  for (const char of needle) {
    if (WORD_BOUNDARY.test(char)) continue;
    const found = haystack.indexOf(char, from);
    if (found === -1) return null;
    if (first === -1) first = found;
    if (found === previous + 1) score += 8;
    else if (found === 0 || WORD_BOUNDARY.test(haystack.charAt(found - 1))) score += 6;
    else score += 1;
    previous = found;
    from = found + 1;
  }
  // Letters scattered across a whole sentence are noise, not a match.
  if (previous - first + 1 > needle.length * 3) return null;
  return score - haystack.length * 0.05;
}
