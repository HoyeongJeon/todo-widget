export interface Reference {
  id: string;
  file: string;
  line: number;
}

export function findReferences(text: string, file: string, prefixes: readonly string[]): Reference[] {
  const pattern = new RegExp(`(?<![A-Za-z0-9])(?:${prefixes.join('|')})-\\d{2,3}(?![0-9])`, 'g');
  const refs: Reference[] = [];
  for (const [index, lineText] of text.split(/\r?\n/).entries()) {
    for (const match of lineText.matchAll(pattern))
      refs.push({ id: match[0], file, line: index + 1 });
  }
  return refs;
}
