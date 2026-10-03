import { posix } from 'node:path';

export type Layer = 'domain' | 'application' | 'presentation' | 'adapters' | 'root';

export interface SourceFile {
  path: string;
  text: string;
}

export interface Violation {
  path: string;
  line: number;
  message: string;
}

/** 네트워크를 쓸 수 있는 유일한 곳 (PRIV-01) */
export const NETWORK_ALLOWED_DIR = 'src/adapters/updater/';

const ALLOWED_IMPORTS: Readonly<Record<Layer, readonly Layer[]>> = {
  domain: ['domain'],
  application: ['domain', 'application'],
  presentation: ['domain', 'application', 'presentation'],
  adapters: ['domain', 'application', 'adapters'],
  root: ['domain', 'application', 'presentation', 'adapters', 'root'],
};

const IMPORT_PATTERN =
  /\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s+['"]([^'"]+)['"]/g;
const NETWORK_PATTERN = /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|@tauri-apps\/plugin-(?:http|websocket|upload)/g;

export function layerOf(path: string): Layer {
  const match = /^src\/(domain|application|presentation|adapters)\//.exec(path);
  return match ? (match[1] as Layer) : 'root';
}

export function checkArchitecture(files: readonly SourceFile[]): Violation[] {
  return files.flatMap((file) => [...importViolations(file), ...networkViolations(file)]);
}

function importViolations(file: SourceFile): Violation[] {
  const from = layerOf(file.path);
  const violations: Violation[] = [];
  for (const match of file.text.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? '';
    const line = lineAt(file.text, match.index ?? 0);
    if (specifier.startsWith('@tauri-apps/')) {
      if (from !== 'adapters' && file.path !== 'src/main.ts')
        violations.push({
          path: file.path,
          line,
          message: `${from} 층은 ${specifier}를 쓸 수 없어요. Tauri는 adapters와 src/main.ts에서만 써요`,
        });
      continue;
    }
    if (!specifier.startsWith('.'))
      continue;
    const target = posix.normalize(posix.join(posix.dirname(file.path), specifier));
    if (!target.startsWith('src/'))
      continue;
    const to = layerOf(target);
    if (!ALLOWED_IMPORTS[from].includes(to))
      violations.push({ path: file.path, line, message: `${from} 층은 ${to} 층(${specifier})을 가져올 수 없어요` });
  }
  return violations;
}

function networkViolations(file: SourceFile): Violation[] {
  if (file.path.startsWith(NETWORK_ALLOWED_DIR))
    return [];
  return [...file.text.matchAll(NETWORK_PATTERN)].map((match) => ({
    path: file.path,
    line: lineAt(file.text, match.index ?? 0),
    message: `네트워크는 ${NETWORK_ALLOWED_DIR}에서만 써요 (PRIV-01): ${match[0]}`,
  }));
}

function lineAt(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}
