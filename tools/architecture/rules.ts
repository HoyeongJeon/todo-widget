import { posix } from 'node:path';

/**
 * `testing`은 `src/testing/`의 테스트용 가짜다. 테스트 파일(*.test.ts, collectSources가 뺀다)만 가져올 수 있고,
 * 제품 코드는 composition root(src/main.ts)까지 어느 층도 가져올 수 없다.
 */
export type Layer = 'domain' | 'application' | 'presentation' | 'adapters' | 'testing' | 'root';

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

/** domain·application이 import해도 되는 바깥 패키지. 늘리려면 PM과 설계 문서 5.1을 함께 고친다. */
export const CORE_PACKAGE_ALLOWLIST: readonly string[] = [];

const CORE_LAYERS: readonly Layer[] = ['domain', 'application'];

const ALLOWED_IMPORTS: Readonly<Record<Layer, readonly Layer[]>> = {
  domain: ['domain'],
  application: ['domain', 'application'],
  presentation: ['domain', 'application', 'presentation'],
  adapters: ['domain', 'application', 'adapters'],
  testing: ['domain', 'application', 'testing'],
  root: ['domain', 'application', 'presentation', 'adapters', 'root'],
};

const IMPORT_PATTERN =
  /\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s+['"]([^'"]+)['"]/g;
const NETWORK_PATTERN = /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|@tauri-apps\/plugin-(?:http|websocket|upload|updater)/g;

export function layerOf(path: string): Layer {
  const match = /^src\/(domain|application|presentation|adapters|testing)\//.exec(path);
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
    if (specifier.startsWith('node:')) {
      violations.push({ path: file.path, line, message: `제품 코드는 Node 모듈(${specifier})을 쓸 수 없어요. 앱은 WebView에서 돌아요` });
      continue;
    }
    if (!specifier.startsWith('.') && CORE_LAYERS.includes(from) && !CORE_PACKAGE_ALLOWLIST.includes(specifier)) {
      const allowed = CORE_PACKAGE_ALLOWLIST.length === 0 ? '없음' : CORE_PACKAGE_ALLOWLIST.join(', ');
      violations.push({ path: file.path, line, message: `${from} 층은 바깥 패키지 ${specifier}를 쓸 수 없어요. 허용 목록: ${allowed}` });
      continue;
    }
    if (!specifier.startsWith('.'))
      continue;
    const target = posix.normalize(posix.join(posix.dirname(file.path), specifier));
    if (!target.startsWith('src/'))
      continue;
    const to = layerOf(target);
    if (to === 'testing' && from !== 'testing') {
      violations.push({ path: file.path, line, message: `${from} 층은 테스트 전용 src/testing/(${specifier})을 가져올 수 없어요` });
      continue;
    }
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
