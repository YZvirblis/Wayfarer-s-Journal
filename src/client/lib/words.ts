const IRREGULAR: Record<string, string> = {
  people: 'person',
  folk: 'folk',
  kin: 'kin',
  children: 'child',
  men: 'man',
  women: 'woman',
};

function matchLeadingCase(source: string, replacement: string): string {
  const first = source.charAt(0);
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/**
 * Section names are plural ("People", "Rumours") but buttons read better in the
 * singular ("New person"). Users name their own sections, so this has to cope
 * with whatever they type — when unsure it returns the name unchanged.
 */
export function singularize(word: string): string {
  const trimmed = word.trim();
  if (!trimmed) return trimmed;

  const irregular = IRREGULAR[trimmed.toLowerCase()];
  if (irregular) return matchLeadingCase(trimmed, irregular);

  if (/[^aeiou]ies$/i.test(trimmed)) return `${trimmed.slice(0, -3)}${trimmed.slice(-1) === 'S' ? 'Y' : 'y'}`;
  if (/(ch|sh|ss|x|z)es$/i.test(trimmed)) return trimmed.slice(0, -2);
  if (/(ss|us|is)$/i.test(trimmed)) return trimmed;
  if (/s$/i.test(trimmed)) return trimmed.slice(0, -1);
  return trimmed;
}
