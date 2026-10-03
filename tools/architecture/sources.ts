import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { SourceFile } from './rules.ts';

/** src/ 아래 제품 코드(.ts, .svelte)를 모은다. 테스트 파일은 제품에 들어가지 않으므로 뺀다. */
export function collectSources(root: string): SourceFile[] {
  const srcDir = join(root, 'src');
  return readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
    .filter((name) => (name.endsWith('.ts') || name.endsWith('.svelte')) && !name.endsWith('.test.ts'))
    .map((name) => {
      const absolute = join(srcDir, name);
      return { path: relative(root, absolute).split(sep).join('/'), text: readFileSync(absolute, 'utf8') };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}
