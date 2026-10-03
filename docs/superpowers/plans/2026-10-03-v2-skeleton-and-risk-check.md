# v2.0 뼈대와 위험 확인 구현 계획 (계획 2/6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WPF 코드를 내리고 Tauri v2 + Svelte 뼈대를 세운 뒤, 층 구조 검사와 CI를 갖추고, 설계 문서 12장의 위험을 Mac에서 실제 앱으로 확인해 결과를 문서에 반영한다.

**Architecture:** 저장소 루트가 곧 Tauri 앱이다. `src/`는 Svelte + TypeScript 화면과 층(domain / application / presentation / adapters), `src-tauri/`는 Rust 껍데기다. 이 계획의 화면은 위험 확인용 **시험 화면**이고, 실제 위젯 화면은 계획 5에서 만든다. 층 의존 방향과 네트워크 사용 제한(PRIV-01)은 Vitest 구조 테스트로 강제한다.

**Tech Stack:** Tauri 2.12.1, Rust 1.99.0, Svelte 5.57.1, Vite 8.3.2, @sveltejs/vite-plugin-svelte 7.3.1, svelte-check 4.7.6, TypeScript 5.9, Vitest 5, objc2-app-kit 0.3, objc2-service-management 0.3, GitHub Actions

**Spec:** `spec/` (기준, 시작점 `spec/README.md`), 설계 문서 `docs/superpowers/specs/2026-10-03-cross-platform-design.md` 5장(구조)·6장(OS별 동작)·11장(가벼움 기준)·12장(위험).

## 사전 확인 결과 (2026-10-03, 계획 작성 중 시험 프로젝트로 확인)

- `create-tauri-app`의 `svelte-ts` 템플릿은 SvelteKit이다. 쓰지 않고 Svelte + Vite를 직접 구성한다(작은 결과물, 빠른 시작).
- 이 계획의 Rust 코드(투명 창, 메뉴 막대 아이콘, Dock 숨김, 전체 화면 위 표시, SMAppService 호출)는 Tauri 2.12.1 + objc2-app-kit 0.3로 컴파일된다.
- **숨긴 창에서는 `requestAnimationFrame`이 오지 않는다.** 그래서 창은 화면을 붙인 직후 JS가 `show_main`을 불러 띄운다.
- release 빌드 `.app`은 3.9MB이고, 프로세스 시작부터 창을 띄우기까지 0.43~0.53초였다(Apple Silicon). PERF-01 목표(0.5초)의 경계라 Task 7에서 정식으로 잰다.
- crates.io에 Tauri 3 alpha가 있지만 안정판 2.12.1을 쓴다.

## Global Constraints

- 커밋 메시지는 `feat:`·`docs:`·`chore:`·`test:`·`ci:` 같은 prefix 뒤에 한국어로 쓴다. `Co-Authored-By` 줄은 넣지 않는다.
- `packageManager`는 `pnpm@10.33.2`다. 작업 전에 `corepack enable`. 설치 뒤 `pnpm-lock.yaml`의 `lockfileVersion`이 `'9.0'`에서 바뀌면 멈추고 보고한다.
- Rust는 `rust-toolchain.toml`의 `1.99.0`을 쓴다.
- 버전은 정확히 고정한다: `tauri` `2.12.1`, `tauri-build` `2.7.1`, `@tauri-apps/api` `2.12.1`, `@tauri-apps/cli` `2.12.1`, `svelte` `5.57.1`, `vite` `8.3.2`, `@sveltejs/vite-plugin-svelte` `7.3.1`, `svelte-check` `4.7.6`. 기존 `typescript` `~5.9.3`, `vitest` `^5.0.3`, `@types/node`는 그대로 둔다.
- 앱 식별자는 `io.github.hoyeongjeon.todowidget`, 제품 이름은 `TodoWidget`이다(개발 결정: 저장소 주인의 GitHub 주소 기반. 출시 뒤에는 바꾸지 않는다).
- TypeScript는 지울 수 있는 문법만 쓰고 import에 `.ts` 확장자를 붙인다(기존 tools/와 같음).
- 층 규칙(설계 문서 5.1): domain → domain만, application → domain·application, presentation → domain·application·presentation, adapters → domain·application·adapters. `@tauri-apps/*`는 `src/adapters/`와 `src/main.ts`에서만 쓴다. 네트워크 API는 `src/adapters/updater/`에서만 쓴다(PRIV-01).
- 테스트 이름에 spec ID를 넣는다(spec/README.md 규칙). `pnpm test && pnpm typecheck && pnpm spec:check`가 매 Task 끝에 통과해야 한다.
- push, 원격 브랜치, 로그인 항목 등록처럼 이 PC나 저장소 밖에 흔적을 남기는 일은 실행 직전에 PM 확인을 받는다(CLAUDE.md).
- subagent는 구현·수정·리뷰 모두 Opus를 쓴다(CLAUDE.md).

---

### Task 1: 도구 고정과 v1.4 코드 내리기

**Files:**
- Create: `rust-toolchain.toml`
- Delete: `src/TodoWidget.Core/`, `src/TodoWidget.App/`, `tests/`, `TodoWidget.slnx`, `nuget.config`
- Modify: `.gitignore`, `README.md`, `CLAUDE.md`

**Interfaces:**
- Produces: 비어 있는 `src/`(다음 Task가 채움), 고정된 Rust 도구, v1.4 근거는 태그 `v1.4.0`에서 본다는 문서 규칙

- [ ] **Step 1: v1.4.0 태그가 v1.4 코드를 가리키는지 확인**

Run: `git show v1.4.0:src/TodoWidget.Core/TodoList.cs | head -3`
Expected: `namespace TodoWidget.Core;`로 시작하는 내용. 태그가 없거나 내용이 다르면 멈추고 보고한다.

- [ ] **Step 2: `rust-toolchain.toml` 작성**

```toml
[toolchain]
channel = "1.99.0"
profile = "minimal"
```

Run: `rustc -V` (저장소 루트에서)
Expected: `rustc 1.99.0`

- [ ] **Step 3: v1.4 C# 코드 삭제**

```bash
git rm -r -q src/TodoWidget.Core src/TodoWidget.App tests TodoWidget.slnx nuget.config
```

- [ ] **Step 4: `.gitignore` 정리**

C# 항목(`bin/`, `obj/`, `TestResults/`, `.vs/`, `*.user`, `release/`)을 지우고 다음으로 바꾼다:

```gitignore
.superpowers/
.devdata/
node_modules/
dist/
src-tauri/target/
src-tauri/gen/
```

- [ ] **Step 5: README 맨 위에 안내 추가**

`README.md` 첫 줄 제목 바로 아래에 다음 문단을 넣는다(나머지는 계획 6에서 새로 쓴다):

```markdown
> **v2.0 개발 중.** Windows·macOS용 v2.0을 `feat/cross-platform` 브랜치에서 다시 만들고 있다. 아래 설명은 v1.4(Windows, WPF) 기준이고, v1.4 코드는 태그 `v1.4.0`에 있다.
```

- [ ] **Step 6: CLAUDE.md 문서 지도 갱신**

문서 지도 표의 "v1.4가 실제로 하는 일" 행을 다음으로 바꾼다:

```markdown
| v1.4가 실제로 하는 일 | 태그 `v1.4.0`의 `src/TodoWidget.Core/`, `tests/TodoWidget.Core.Tests/` (`git show v1.4.0:경로`로 본다) |
```

- [ ] **Step 7: 검사와 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`
Expected: 46 tests passed, 타입 오류 없음, `통과`

```bash
git add -A
git commit -m "chore: v1.4 WPF 코드를 내리고 Rust 도구 버전을 고정"
```

---

### Task 2: 프런트엔드 뼈대 (Svelte + Vite + TypeScript)

**Files:**
- Modify: `package.json`, `tsconfig.json` → `tsconfig.tools.json`으로 이름 바꾸기
- Create: `tsconfig.json`(앱용), `vite.config.ts`, `index.html`, `src/main.ts`, `src/presentation/App.svelte`, `src/presentation/app.test.ts`

**Interfaces:**
- Consumes: Task 1의 빈 `src/`
- Produces: `pnpm dev`, `pnpm build`(→ `dist/`), `pnpm typecheck`(tools + 앱), `pnpm test`가 `src/**/*.test.ts`와 `tools/**/*.test.ts`를 함께 돌림. `App.svelte` props: `{ onReady?: () => void }`

- [ ] **Step 1: 의존성 추가**

```bash
git mv tsconfig.json tsconfig.tools.json
pnpm add -E @tauri-apps/api@2.12.1
pnpm add -D -E svelte@5.57.1 vite@8.3.2 @sveltejs/vite-plugin-svelte@7.3.1 svelte-check@4.7.6 @tauri-apps/cli@2.12.1
```

Expected: `pnpm-lock.yaml`의 `lockfileVersion: '9.0'` 그대로.

- [ ] **Step 2: `package.json` scripts 바꾸기**

`scripts`를 다음으로 바꾼다(다른 필드는 그대로):

```json
{
  "dev": "vite",
  "build": "vite build",
  "tauri": "tauri",
  "test": "vitest run",
  "typecheck": "tsc --noEmit -p tsconfig.tools.json && svelte-check --tsconfig ./tsconfig.json --fail-on-warnings",
  "spec:check": "node tools/spec-check/cli.ts",
  "spec:check:strict": "node tools/spec-check/cli.ts --strict"
}
```

- [ ] **Step 3: 앱용 `tsconfig.json` 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["node", "svelte"]
  },
  "include": ["src/**/*.ts", "src/**/*.svelte", "tools/architecture/**/*.ts"]
}
```

- [ ] **Step 4: `vite.config.ts` 작성**

```ts
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { target: 'es2022' },
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 5: 실패하는 테스트 작성**

`src/presentation/app.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import App from './App.svelte';

describe('시험 화면', () => {
  it('Svelte 컴포넌트로 컴파일된다', () => {
    expect(typeof App).toBe('function');
  });
});
```

Run: `pnpm vitest run src/presentation/app.test.ts`
Expected: FAIL (`./App.svelte`를 찾지 못함)

- [ ] **Step 6: `index.html`, `src/main.ts`, `src/presentation/App.svelte` 작성**

`index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>TodoWidget</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts` (composition root. Task 5에서 Tauri adapter를 연결한다):

```ts
import { mount } from 'svelte';
import App from './presentation/App.svelte';

const target = document.getElementById('app');
if (!target)
  throw new Error('#app 요소가 없어요');

mount(App, { target, props: {} });
```

`src/presentation/App.svelte`:

```svelte
<script lang="ts">
  // 계획 2의 위험 확인용 시험 화면이다. 실제 위젯 화면은 계획 5에서 만든다.
  let { onReady }: { onReady?: () => void } = $props();

  let items = $state<string[]>([]);
  let text = $state('');

  $effect(() => {
    onReady?.();
  });

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.isComposing)
      return;
    const title = text.trim();
    if (title.length === 0)
      return;
    items.push(title);
    text = '';
  }
</script>

<main class="card">
  <h1>할 일 (시험 화면)</h1>
  <ul>
    {#each items as item, index (index)}
      <li>{item}</li>
    {/each}
  </ul>
  <input bind:value={text} onkeydown={onKeydown} placeholder="할 일 추가" />
</main>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    background: transparent;
  }

  .card {
    margin: 10px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(250, 248, 245, var(--card-alpha, 1));
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    font-family: system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  }

  h1 {
    font-size: 15px;
    margin: 0 0 8px;
  }

  input {
    width: 100%;
    box-sizing: border-box;
  }
</style>
```

- [ ] **Step 7: 통과 확인**

Run: `pnpm test && pnpm typecheck && pnpm build && pnpm spec:check`
Expected: 47 tests passed, `svelte-check found 0 errors and 0 warnings`, `dist/index.html` 생성, `통과`

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat: Svelte·Vite 프런트엔드 뼈대와 위험 확인용 시험 화면 추가"
```

---

### Task 3: 층 구조 테스트 (PRIV-01 포함)

**Files:**
- Create: `tools/architecture/rules.ts`, `tools/architecture/sources.ts`, `src/architecture.test.ts`
- Modify: `tsconfig.tools.json` (include에 `tools/**/*.ts`가 이미 있으면 그대로), `docs/superpowers/specs/2026-10-03-cross-platform-design.md` 5.1

**Interfaces:**
- Produces:
  - `type Layer = 'domain' | 'application' | 'presentation' | 'adapters' | 'root'`
  - `interface SourceFile { path: string; text: string }` — `path`는 저장소 루트 기준 posix 경로(예: `src/domain/todo-list.ts`)
  - `interface Violation { path: string; line: number; message: string }`
  - `layerOf(path: string): Layer`
  - `checkArchitecture(files: readonly SourceFile[]): Violation[]`
  - `collectSources(root: string): SourceFile[]` — `src/` 아래 `.ts`·`.svelte` 중 `.test.ts`가 아닌 것
  - `NETWORK_ALLOWED_DIR = 'src/adapters/updater/'`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/architecture.test.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkArchitecture, layerOf } from '../tools/architecture/rules.ts';
import { collectSources } from '../tools/architecture/sources.ts';

const file = (path: string, text: string) => ({ path, text });

describe('층 구분', () => {
  it('src 아래 첫 폴더로 층을 정한다', () => {
    expect(layerOf('src/domain/todo-list.ts')).toBe('domain');
    expect(layerOf('src/adapters/tauri/window.ts')).toBe('adapters');
    expect(layerOf('src/main.ts')).toBe('root');
  });
});

describe('의존 방향', () => {
  it('domain은 다른 층을 가져올 수 없다', () => {
    const violations = checkArchitecture([file('src/domain/a.ts', "import { b } from '../application/b.ts';")]);
    expect(violations).toEqual([
      { path: 'src/domain/a.ts', line: 1, message: 'domain 층은 application 층(../application/b.ts)을 가져올 수 없어요' },
    ]);
  });

  it('application은 domain을 가져올 수 있지만 presentation은 안 된다', () => {
    const ok = checkArchitecture([file('src/application/a.ts', "import type { T } from '../domain/t.ts';")]);
    const bad = checkArchitecture([file('src/application/a.ts', "import V from '../presentation/V.svelte';")]);
    expect(ok).toEqual([]);
    expect(bad.map((v) => v.message)).toEqual(['application 층은 presentation 층(../presentation/V.svelte)을 가져올 수 없어요']);
  });

  it('presentation은 adapters를, adapters는 presentation을 가져올 수 없다', () => {
    const violations = checkArchitecture([
      file('src/presentation/a.ts', "import { x } from '../adapters/x.ts';"),
      file('src/adapters/b.ts', "export { y } from '../presentation/y.ts';"),
    ]);
    expect(violations.map((v) => v.path)).toEqual(['src/presentation/a.ts', 'src/adapters/b.ts']);
  });

  it('여러 줄 import와 동적 import도 검사하고 줄 번호를 알려 준다', () => {
    const text = ['// 첫 줄', 'import {', '  a,', "} from '../adapters/a.ts';", "const m = import('../adapters/m.ts');"].join('\n');
    const violations = checkArchitecture([file('src/domain/x.ts', text)]);
    expect(violations.map((v) => v.line)).toEqual([2, 5]);
  });

  it('composition root(src/main.ts)는 모든 층을 가져올 수 있다', () => {
    const text = "import App from './presentation/App.svelte';\nimport { w } from './adapters/w.ts';";
    expect(checkArchitecture([file('src/main.ts', text)])).toEqual([]);
  });

  it('Tauri는 adapters와 src/main.ts에서만 쓴다', () => {
    const violations = checkArchitecture([
      file('src/adapters/w.ts', "import { invoke } from '@tauri-apps/api/core';"),
      file('src/main.ts', "import { invoke } from '@tauri-apps/api/core';"),
      file('src/presentation/P.svelte', "<script>import { invoke } from '@tauri-apps/api/core';</script>"),
    ]);
    expect(violations).toEqual([
      {
        path: 'src/presentation/P.svelte',
        line: 1,
        message: 'presentation 층은 @tauri-apps/api/core를 쓸 수 없어요. Tauri는 adapters와 src/main.ts에서만 써요',
      },
    ]);
  });
});

describe('네트워크 사용 제한', () => {
  it('PRIV-01 네트워크 API는 updater adapter 밖에서 쓰지 않는다', () => {
    const violations = checkArchitecture([
      file('src/presentation/a.ts', "await fetch('https://example.com');"),
      file('src/application/b.ts', 'const ws = new WebSocket(url);'),
      file('src/adapters/http.ts', "import { fetch } from '@tauri-apps/plugin-http';"),
      file('src/adapters/updater/check.ts', "const r = await fetch(url);"),
    ]);
    expect(violations.map((v) => v.path)).toEqual([
      'src/presentation/a.ts',
      'src/application/b.ts',
      'src/adapters/http.ts',
    ]);
    expect(violations[0]?.message).toBe('네트워크는 src/adapters/updater/에서만 써요 (PRIV-01): fetch(');
  });

  it('PRIV-01 실제 소스가 층 규칙과 네트워크 제한을 지킨다', () => {
    const root = fileURLToPath(new URL('..', import.meta.url));
    expect(checkArchitecture(collectSources(root))).toEqual([]);
  });
});
```

Run: `pnpm vitest run src/architecture.test.ts`
Expected: FAIL (`../tools/architecture/rules.ts`를 찾지 못함)

- [ ] **Step 2: `tools/architecture/rules.ts` 구현**

```ts
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
const NETWORK_PATTERN = /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|@tauri-apps\/plugin-http/g;

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
```

주의: `@tauri-apps/plugin-http`는 import 검사와 네트워크 검사 둘 다에 걸린다. adapters 안의 `src/adapters/http.ts`는 import 검사는 통과하고 네트워크 검사에서만 걸려야 테스트 기대값(위반 1건)과 맞는다.

- [ ] **Step 3: `tools/architecture/sources.ts` 구현**

```ts
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
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/architecture.test.ts`
Expected: PASS (9 tests)

Run: `pnpm test && pnpm typecheck && pnpm spec:check`
Expected: 56 tests passed, 타입 오류 없음. spec:check 안내 목록에서 `PRIV-01`이 사라지고 `통과`

- [ ] **Step 5: 설계 문서 5.1 고치기**

5.1의 "의존 방향은 lint 규칙으로 막는다" 문장을 다음으로 바꾸고 변경 이력에 한 줄 추가한다:

```markdown
- 의존 방향과 네트워크 제한(PRIV-01)은 Vitest 구조 테스트(`src/architecture.test.ts`, 규칙은 `tools/architecture/`)로 막는다. 어기면 `pnpm test`와 CI가 실패한다. 별도 ESLint 규칙은 두지 않는다(개발 결정: 도구 하나로 충분하고, 규칙을 테스트로 읽을 수 있다).
```

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "test: 층 의존 방향과 네트워크 제한(PRIV-01)을 구조 테스트로 강제"
```

---

### Task 4: Tauri 뼈대와 창 설정

**Files:**
- Create: `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`, `src-tauri/icons/*`(임시 아이콘), `src/tauri-config.test.ts`
- Modify: `pnpm-lock.yaml`(변화 없어야 함)

**Interfaces:**
- Consumes: Task 2의 `pnpm dev`(포트 1420), `pnpm build`(→ `dist/`)
- Produces: Rust lib 이름 `todo_widget_lib`, 창 label `main`, Tauri 명령 `show_main(painted_at_ms: f64)`. 창은 처음에 숨겨져 있고 `show_main`이 띄운다.

- [ ] **Step 1: 임시 아이콘 준비**

진짜 아이콘은 계획 5에서 만든다. 지금은 Tauri 템플릿의 기본 아이콘을 쓴다:

```bash
TMP=$(mktemp -d)
(cd "$TMP" && npx -y create-tauri-app@4.7.4 icons-src -m pnpm -t vanilla-ts --identifier io.github.hoyeongjeon.todowidget --tauri-version 2 -y >/dev/null)
mkdir -p src-tauri
cp -R "$TMP/icons-src/src-tauri/icons" src-tauri/icons
rm -rf "$TMP"
ls src-tauri/icons
```

Expected: `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico` 등이 있다.

- [ ] **Step 2: 실패하는 설정 테스트 작성**

`src/tauri-config.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
const mainWindow = config.app.windows.find((w: { label: string }) => w.label === 'main');

describe('Tauri 설정', () => {
  it('MAC-10 투명 창을 위해 macOSPrivateApi를 켠다', () => {
    expect(config.app.macOSPrivateApi).toBe(true);
    expect(mainWindow.transparent).toBe(true);
  });

  it('REL-09 macOS 빌드는 ad-hoc 서명을 한다', () => {
    expect(config.bundle.macOS.signingIdentity).toBe('-');
  });

  it('창은 테두리 없이 숨긴 채 시작하고 작업 표시줄에 나오지 않는다', () => {
    expect(mainWindow).toMatchObject({
      decorations: false,
      visible: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      visibleOnAllWorkspaces: true,
      shadow: false,
    });
  });

  it('식별자와 제품 이름이 정해진 값이다', () => {
    expect(config.identifier).toBe('io.github.hoyeongjeon.todowidget');
    expect(config.productName).toBe('TodoWidget');
  });
});
```

Run: `pnpm vitest run src/tauri-config.test.ts`
Expected: FAIL (`tauri.conf.json`이 없음)

- [ ] **Step 3: Rust 크레이트 작성**

`src-tauri/Cargo.toml`:

```toml
[package]
name = "todo-widget"
version = "2.0.0"
description = "늘 떠 있는 작은 할 일 위젯"
edition = "2021"

[lib]
name = "todo_widget_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "=2.7.1", features = [] }

[dependencies]
tauri = { version = "=2.12.1", features = ["tray-icon", "macos-private-api"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[target.'cfg(target_os = "macos")'.dependencies]
objc2 = "0.6"
objc2-app-kit = { version = "0.3", features = ["NSWindow", "NSResponder"] }
objc2-service-management = { version = "0.3", features = ["SMAppService"] }

[profile.release]
codegen-units = 1
lto = true
opt-level = "s"
panic = "abort"
strip = true
```

(개발 결정: `opt-level = "s"`로 크기를 우선한다. Task 7에서 시작 시간이 목표를 넘으면 `3`과 비교한다.)

`src-tauri/build.rs`:

```rust
fn main() {
    tauri_build::build()
}
```

`src-tauri/src/main.rs`:

```rust
// Windows release 빌드에서 콘솔 창을 띄우지 않는다.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    todo_widget_lib::run()
}
```

`src-tauri/src/lib.rs`:

```rust
use tauri::{AppHandle, Manager};

/// 창을 앞으로 가져온다. 처음 띄울 때와 다시 부를 때 같이 쓴다.
pub(crate) fn bring_to_front(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 화면이 준비되면 JS가 부른다. 숨긴 창에서는 requestAnimationFrame이 오지 않으므로 mount 직후에 부른다.
#[tauri::command]
fn show_main(app: AppHandle, painted_at_ms: f64) {
    let _ = painted_at_ms;
    bring_to_front(&app);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![show_main])
        .run(tauri::generate_context!())
        .expect("TodoWidget을 실행하지 못했어요");
}
```

`src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "TodoWidget",
  "version": "2.0.0",
  "identifier": "io.github.hoyeongjeon.todowidget",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "app": {
    "macOSPrivateApi": true,
    "windows": [
      {
        "label": "main",
        "title": "TodoWidget",
        "width": 320,
        "height": 420,
        "minWidth": 280,
        "maxWidth": 620,
        "minHeight": 120,
        "transparent": true,
        "decorations": false,
        "visible": false,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "visibleOnAllWorkspaces": true,
        "shadow": false,
        "resizable": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src ipc: http://ipc.localhost; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
      "devCsp": "default-src 'self'; connect-src ipc: http://ipc.localhost ws://localhost:1420 http://localhost:1420; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["app", "dmg", "nsis"],
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"],
    "macOS": {
      "signingIdentity": "-",
      "minimumSystemVersion": "13.0"
    }
  }
}
```

`src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "주 창 권한",
  "windows": ["main"],
  "permissions": ["core:default", "core:window:allow-start-dragging", "core:window:allow-start-resize-dragging"]
}
```

`csp`의 `connect-src`는 Tauri 내부 통신(`ipc:`)만 허용하므로 화면 코드는 외부로 네트워크 요청을 보낼 수 없다(PRIV-01을 런타임에서도 막는다). 업데이트 확인은 Rust 쪽 updater plugin이 하므로 이 제한에 걸리지 않는다. `devCsp`는 `pnpm tauri dev`의 Vite 새로고침 연결만 더 허용한다.

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/tauri-config.test.ts`
Expected: PASS (4 tests)

Run: `cargo build --manifest-path src-tauri/Cargo.toml`
Expected: `Finished` (처음에는 몇 분 걸린다)

Run: `pnpm test && pnpm typecheck && pnpm spec:check`
Expected: 60 tests passed, 타입 오류 없음, 안내 목록에서 `MAC-10`, `REL-09`가 사라지고 `통과`

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: Tauri v2 뼈대와 투명·테두리 없는 숨김 시작 창 설정"
```

---

### Task 5: 창 띄우기, macOS 메뉴 막대·Spaces, 시험 도구

**Files:**
- Create: `src/adapters/tauri/window.ts`, `src-tauri/src/platform/mod.rs`, `src-tauri/src/platform/macos.rs`, `src-tauri/src/probe.rs`, `src/adapters/tauri/window.test.ts`
- Modify: `src/main.ts`, `src/presentation/App.svelte`, `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: Task 4의 `show_main`, 창 label `main`
- Produces:
  - TS adapter `createWindowControls(invoke, currentWindow)` → `{ ready(paintedAtMs: number): Promise<void>; setPinned(pinned: boolean): Promise<void>; startDragging(): Promise<void>; startResize(direction: ResizeEdge): Promise<void> }`, `type ResizeEdge = 'East' | 'South' | 'SouthEast' | 'West' | 'SouthWest'`
  - Tauri 명령 `set_pinned(pinned: bool)`
  - `App.svelte` props `{ controls: WindowControlsPort }` (presentation 안에 port 타입 정의)
  - 환경 변수 `TODOWIDGET_PROBE=1`이면 stderr에 `probe: shown <ms>ms after process start`를 찍는다.
  - 명령줄 `--probe-login-item status|register|unregister` (macOS): SMAppService 결과를 stdout에 찍고 끝난다.

- [ ] **Step 1: adapter 테스트 작성 (실패 확인)**

`src/adapters/tauri/window.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createWindowControls } from './window.ts';

function fakes() {
  const invoke = vi.fn(async () => undefined);
  const currentWindow = {
    startDragging: vi.fn(async () => undefined),
    startResizeDragging: vi.fn(async () => undefined),
  };
  return { invoke, currentWindow, controls: createWindowControls(invoke, currentWindow) };
}

describe('창 제어 adapter', () => {
  it('ready는 show_main 명령에 그린 시각을 넘긴다', async () => {
    const { invoke, controls } = fakes();
    await controls.ready(3.5);
    expect(invoke).toHaveBeenCalledWith('show_main', { paintedAtMs: 3.5 });
  });

  it('setPinned는 set_pinned 명령을 부른다', async () => {
    const { invoke, controls } = fakes();
    await controls.setPinned(false);
    expect(invoke).toHaveBeenCalledWith('set_pinned', { pinned: false });
  });

  it('끌기와 크기 조절은 Tauri 창 API로 넘긴다', async () => {
    const { currentWindow, controls } = fakes();
    await controls.startDragging();
    await controls.startResize('SouthEast');
    expect(currentWindow.startDragging).toHaveBeenCalledOnce();
    expect(currentWindow.startResizeDragging).toHaveBeenCalledWith('SouthEast');
  });
});
```

Run: `pnpm vitest run src/adapters/tauri/window.test.ts`
Expected: FAIL (`./window.ts`를 찾지 못함)

- [ ] **Step 2: port와 adapter 구현**

port 타입은 presentation이 정의한다(의존 방향: adapters → presentation 금지이므로, port는 adapters가 가져오지 않고 구조적 타입으로 맞춘다).

`src/presentation/window-controls.ts`:

```ts
export type ResizeEdge = 'East' | 'South' | 'SouthEast' | 'West' | 'SouthWest';

/** 화면이 창에 바라는 것. 실제 구현은 src/adapters/tauri/window.ts. */
export interface WindowControlsPort {
  ready(paintedAtMs: number): Promise<void>;
  setPinned(pinned: boolean): Promise<void>;
  startDragging(): Promise<void>;
  startResize(direction: ResizeEdge): Promise<void>;
}
```

`src/adapters/tauri/window.ts`:

```ts
type ResizeEdge = 'East' | 'South' | 'SouthEast' | 'West' | 'SouthWest';

type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

interface CurrentWindow {
  startDragging(): Promise<void>;
  startResizeDragging(direction: ResizeEdge): Promise<void>;
}

export function createWindowControls(invoke: Invoke, currentWindow: CurrentWindow) {
  return {
    async ready(paintedAtMs: number): Promise<void> {
      await invoke('show_main', { paintedAtMs });
    },
    async setPinned(pinned: boolean): Promise<void> {
      await invoke('set_pinned', { pinned });
    },
    startDragging: (): Promise<void> => currentWindow.startDragging(),
    startResize: (direction: ResizeEdge): Promise<void> => currentWindow.startResizeDragging(direction),
  };
}
```

(`ResizeEdge`를 adapters에 다시 쓰는 것은 의도다. adapters는 presentation을 import할 수 없고, TypeScript 구조적 타입이라 `main.ts`에서 두 쪽이 맞는지 컴파일러가 확인한다.)

`src/main.ts`:

```ts
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { mount } from 'svelte';
import { createWindowControls } from './adapters/tauri/window.ts';
import App from './presentation/App.svelte';
import type { WindowControlsPort } from './presentation/window-controls.ts';

const startedAt = performance.now();
const target = document.getElementById('app');
if (!target)
  throw new Error('#app 요소가 없어요');

const controls: WindowControlsPort = createWindowControls(invoke, getCurrentWindow());
mount(App, { target, props: { controls, startedAt } });
```

`src/presentation/App.svelte` — Task 2의 내용을 다음으로 바꾼다(시험 화면: 입력, 📌, 투명도, 끌기, 크기 조절 손잡이):

```svelte
<script lang="ts">
  // 계획 2의 위험 확인용 시험 화면이다. 실제 위젯 화면은 계획 5에서 만든다.
  import type { ResizeEdge, WindowControlsPort } from './window-controls.ts';

  let { controls, startedAt }: { controls: WindowControlsPort; startedAt: number } = $props();

  let items = $state<string[]>([]);
  let text = $state('');
  let pinned = $state(true);
  let transparency = $state(0);

  $effect(() => {
    void controls.ready(performance.now() - startedAt);
  });

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.isComposing)
      return;
    const title = text.trim();
    if (title.length === 0)
      return;
    items.push(title);
    text = '';
  }

  function togglePin(): void {
    pinned = !pinned;
    void controls.setPinned(pinned);
  }

  function resize(edge: ResizeEdge) {
    return (event: PointerEvent): void => {
      event.preventDefault();
      void controls.startResize(edge);
    };
  }
</script>

<main class="card" style:--card-alpha={1 - transparency / 100}>
  <header role="presentation" onpointerdown={() => void controls.startDragging()}>
    <h1>할 일 (시험 화면)</h1>
    <button onpointerdown={(e) => e.stopPropagation()} onclick={togglePin}>{pinned ? '📌 켬' : '📌 끔'}</button>
  </header>
  <ul>
    {#each items as item, index (index)}
      <li>{item}</li>
    {/each}
  </ul>
  <input bind:value={text} onkeydown={onKeydown} placeholder="할 일 추가" />
  <label>투명도 {transparency}% <input type="range" min="0" max="40" bind:value={transparency} /></label>
</main>
<div class="edge east" role="presentation" onpointerdown={resize('East')}></div>
<div class="edge south" role="presentation" onpointerdown={resize('South')}></div>
<div class="edge south-east" role="presentation" onpointerdown={resize('SouthEast')}></div>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    background: transparent;
    overflow: hidden;
  }

  .card {
    margin: 10px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(250, 248, 245, var(--card-alpha, 1));
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    font-family: system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: grab;
  }

  h1 {
    font-size: 15px;
    margin: 0 0 8px;
  }

  input:not([type]) {
    width: 100%;
    box-sizing: border-box;
  }

  .edge {
    position: fixed;
  }

  .east {
    top: 0;
    right: 0;
    width: 8px;
    height: 100%;
    cursor: ew-resize;
  }

  .south {
    left: 0;
    bottom: 0;
    width: 100%;
    height: 8px;
    cursor: ns-resize;
  }

  .south-east {
    right: 0;
    bottom: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
  }
</style>
```

Task 2에서 만든 `src/presentation/app.test.ts`는 그대로 둔다(컴파일 확인).

- [ ] **Step 3: adapter 테스트 통과 확인**

Run: `pnpm vitest run src/adapters/tauri/window.test.ts src/architecture.test.ts`
Expected: PASS. 구조 테스트의 실제 소스 검사도 통과해야 한다(App.svelte는 Tauri를 직접 쓰지 않는다).

- [ ] **Step 4: Rust 플랫폼 코드와 시험 도구**

`src-tauri/src/platform/mod.rs`:

```rust
#[cfg(target_os = "macos")]
pub mod macos;
```

`src-tauri/src/platform/macos.rs`:

```rust
//! macOS 전용: Dock 숨김, 메뉴 막대 아이콘, 모든 Spaces, 전체 화면 위 표시, 로그인 항목.
use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, WebviewWindow,
};

/// Dock과 Cmd+Tab에 나오지 않게 한다 (MAC-02).
pub fn hide_from_dock(app: &mut App) {
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);
}

/// 메뉴 막대 아이콘 (MAC-03, MAC-04). 문구는 계획 5에서 다국어 사전으로 바꾼다.
pub fn install_tray(app: &App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "열기", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;
    TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().expect("기본 아이콘이 없어요").clone())
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => crate::bring_to_front(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                crate::bring_to_front(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

/// 모든 Spaces에 따라다니고(MAC-06), 📌가 켜져 있으면 전체 화면 앱 위에도 뜬다(MAC-07).
pub fn set_full_screen_auxiliary(window: &WebviewWindow, pinned: bool) {
    let Ok(pointer) = window.ns_window() else { return };
    let address = pointer as usize;
    let _ = window.run_on_main_thread(move || {
        // SAFETY: Tauri가 준 NSWindow 포인터이고, 메인 스레드에서만 쓴다.
        let ns_window: &NSWindow = unsafe { &*(address as *const NSWindow) };
        let mut behavior = ns_window.collectionBehavior() | NSWindowCollectionBehavior::CanJoinAllSpaces;
        if pinned {
            behavior |= NSWindowCollectionBehavior::FullScreenAuxiliary;
        } else {
            behavior &= !NSWindowCollectionBehavior::FullScreenAuxiliary;
        }
        ns_window.setCollectionBehavior(behavior);
    });
}

/// 로그인 항목 시험 (계획 2 Task 7). action: "status" | "register" | "unregister".
pub fn probe_login_item(action: &str) -> String {
    use objc2_service_management::SMAppService;
    // SAFETY: SMAppService는 macOS 13 이상에서 쓸 수 있고, minimumSystemVersion이 13.0이다.
    let service = unsafe { SMAppService::mainAppService() };
    let result = match action {
        "register" => unsafe { service.registerAndReturnError() }.map_err(|e| format!("{e:?}")),
        "unregister" => unsafe { service.unregisterAndReturnError() }.map_err(|e| format!("{e:?}")),
        _ => Ok(()),
    };
    format!("{result:?} {:?}", unsafe { service.status() })
}
```

`src-tauri/src/probe.rs`:

```rust
//! 계획 2 위험 확인용 측정. TODOWIDGET_PROBE=1일 때만 찍는다.
use std::sync::OnceLock;
use std::time::Instant;

static STARTED: OnceLock<Instant> = OnceLock::new();

pub fn mark_process_start() {
    let _ = STARTED.set(Instant::now());
}

pub fn report_shown(painted_at_ms: f64) {
    if std::env::var_os("TODOWIDGET_PROBE").is_none() {
        return;
    }
    if let Some(started) = STARTED.get() {
        eprintln!(
            "probe: shown {}ms after process start (first paint {painted_at_ms:.0}ms after JS start)",
            started.elapsed().as_millis()
        );
    }
}
```

`src-tauri/src/lib.rs`를 다음으로 바꾼다:

```rust
mod platform;
mod probe;

use tauri::{AppHandle, Manager};

/// 창을 앞으로 가져온다. 처음 띄울 때와 다시 부를 때 같이 쓴다.
pub(crate) fn bring_to_front(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 화면이 준비되면 JS가 부른다. 숨긴 창에서는 requestAnimationFrame이 오지 않으므로 mount 직후에 부른다.
#[tauri::command]
fn show_main(app: AppHandle, painted_at_ms: f64) {
    probe::report_shown(painted_at_ms);
    bring_to_front(&app);
}

/// 📌 맨 위 고정 (WND-09). macOS는 전체 화면 위 표시도 함께 바꾼다 (MAC-07).
#[tauri::command]
fn set_pinned(app: AppHandle, pinned: bool) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(pinned);
        #[cfg(target_os = "macos")]
        platform::macos::set_full_screen_auxiliary(&window, pinned);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    probe::mark_process_start();

    #[cfg(target_os = "macos")]
    if let Some(position) = std::env::args().position(|a| a == "--probe-login-item") {
        let action = std::env::args().nth(position + 1).unwrap_or_else(|| "status".into());
        println!("{}", platform::macos::probe_login_item(&action));
        return;
    }

    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![show_main, set_pinned])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                platform::macos::hide_from_dock(app);
                platform::macos::install_tray(app)?;
                if let Some(window) = app.get_webview_window("main") {
                    platform::macos::set_full_screen_auxiliary(&window, true);
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("TodoWidget을 실행하지 못했어요");

    app.run(|app, event| {
        // Spotlight·응용 프로그램 폴더에서 다시 열면 macOS가 Reopen을 보낸다 (MAC-05).
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = event {
            bring_to_front(app);
        }
        let _ = (app, event);
    });
}
```

- [ ] **Step 5: 빌드와 검사**

Run: `cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | tail -3`
Expected: `Finished`, 경고 없음

Run: `pnpm test && pnpm typecheck && pnpm spec:check`
Expected: 모두 통과

Run: `pnpm tauri build --bundles app 2>&1 | tail -3`
Expected: `TodoWidget.app` 생성

Run (실행 확인, 5초 뒤 종료):

```bash
APP=src-tauri/target/release/bundle/macos/TodoWidget.app/Contents/MacOS/todo-widget
(TODOWIDGET_PROBE=1 "$APP" > /tmp/todowidget-probe.log 2>&1 &) ; sleep 5 ; pkill -f "MacOS/todo-widget" ; cat /tmp/todowidget-probe.log
```

Expected: `probe: shown <N>ms after process start ...` 한 줄. 이 줄이 없으면 창이 뜨지 않은 것이다. 먼저 CSP를 의심한다: `tauri.conf.json`의 `csp`를 잠시 `null`로 바꿔 다시 빌드해 보고, 그때는 뜨면 CSP 문제로 보고한다. 그래도 안 뜨면 멈추고 보고한다.

**화면 캡처를 하지 않는다.** 전체 화면 캡처에는 PM의 다른 창이 찍힌다. 눈으로 보는 확인은 Task 7에서 PM과 함께 한다.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: 창 띄우기·맨 위 고정과 macOS 메뉴 막대·Spaces·로그인 항목 시험 도구"
```

---

### Task 6: CI (GitHub Actions)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: push·PR마다 macOS·Windows에서 검사하는 workflow, 수동 실행(`workflow_dispatch`)으로 Windows 시험 설치 파일을 artifact로 올리는 job

- [ ] **Step 1: workflow 작성**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, 'feat/**']
  pull_request:
  workflow_dispatch:
    inputs:
      windows_probe:
        description: Windows 시험 설치 파일을 만든다
        type: boolean
        default: false

jobs:
  check:
    name: REL-01 검사 (${{ matrix.os }})
    strategy:
      fail-fast: false
      matrix:
        os: [macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - name: Rust 도구 설치 (rust-toolchain.toml)
        run: rustup toolchain install
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri
      - run: pnpm install --frozen-lockfile
      - name: 테스트
        run: pnpm test
      - name: 타입 검사
        run: pnpm typecheck
      - name: spec 검사
        run: pnpm spec:check
      - name: Rust 테스트
        run: cargo test --manifest-path src-tauri/Cargo.toml
      - name: 빌드 확인
        run: pnpm tauri build --debug --no-bundle

  windows-probe:
    name: Windows 시험 설치 파일
    if: github.event_name == 'workflow_dispatch' && inputs.windows_probe
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: rustup toolchain install
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri
      - run: pnpm install --frozen-lockfile
      - run: pnpm tauri build --bundles nsis
      - uses: actions/upload-artifact@v4
        with:
          name: todowidget-windows-probe
          path: src-tauri/target/release/bundle/nsis/*.exe
          retention-days: 7
```

- [ ] **Step 2: 로컬 확인**

Run: `pnpm spec:check`
Expected: 안내 목록에서 `REL-01`이 사라지고 `통과` (job 이름에 ID가 있다)

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo ok` (PyYAML이 없으면 `npx -y yaml-lint .github/workflows/ci.yml`)
Expected: `ok`

**push하지 않는다.** CI는 PM이 push를 승인한 뒤에 처음 돈다(Task 8).

- [ ] **Step 3: 커밋**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: macOS·Windows 검사 workflow와 Windows 시험 설치 파일 job 추가"
```

---

### Task 7: Mac 위험 확인

이 Task는 측정 부분(Step 1~4)만 subagent가 하고, 눈으로 보는 확인과 로그인 항목 시험(Step 5~6)은 controller가 PM과 함께 한다.

**Files:**
- Create: `docs/superpowers/reports/2026-10-03-plan2-risk-check.md`

**Interfaces:**
- Consumes: Task 5의 release 빌드, `TODOWIDGET_PROBE`, `--probe-login-item`
- Produces: 보고서(측정값, 확인 결과, 설계 문서 12장 항목별 결론)

- [ ] **Step 1: release 빌드와 크기 (PERF-05 참고값)**

```bash
pnpm tauri build --bundles app,dmg 2>&1 | tail -3
du -sh src-tauri/target/release/bundle/macos/TodoWidget.app
ls -l src-tauri/target/release/bundle/dmg/*.dmg
```

보고서에 `.app` 크기와 dmg 크기를 적는다. 기준: dmg 15MB 이하.

- [ ] **Step 2: 시작 시간 10회 (PERF-01)**

```bash
APP=src-tauri/target/release/bundle/macos/TodoWidget.app/Contents/MacOS/todo-widget
for i in $(seq 1 10); do
  (TODOWIDGET_PROBE=1 "$APP" > /tmp/todowidget-run-$i.log 2>&1 &)
  sleep 3; pkill -f "MacOS/todo-widget"; sleep 1
done
grep -h "probe: shown" /tmp/todowidget-run-*.log
```

보고서에 10개 값, 중앙값, 최댓값을 적는다. 기준: 중앙값 0.5초 이하.
중앙값이 0.5초를 넘으면 `src-tauri/Cargo.toml`의 `opt-level`을 `3`으로 바꿔 한 번 더 재고 두 결과를 함께 적는다(바꾼 설정은 커밋하지 않고 되돌린다).

- [ ] **Step 3: 가만히 있을 때 메모리와 CPU (PERF-03, PERF-04)**

```bash
pre=$(pgrep -f "com.apple.WebKit" | sort)
(TODOWIDGET_PROBE=1 "$APP" >/dev/null 2>&1 &)
sleep 60
post=$(pgrep -f "com.apple.WebKit" | sort)
new=$(comm -13 <(echo "$pre") <(echo "$post"))
for p in $(pgrep -f "MacOS/todo-widget") $new; do footprint -p $p 2>/dev/null | grep -E "Footprint:"; done
for p in $(pgrep -f "MacOS/todo-widget") $new; do ps -o pid=,%cpu=,command= -p $p; done
pkill -f "MacOS/todo-widget"
```

보고서에 프로세스별 footprint와 합계, CPU를 적는다. 기준: 합계 120MB 이하, CPU 1% 미만.
`footprint`가 권한 문제로 일부 프로세스를 읽지 못하면 그 사실을 적고 `ps -o rss=` 값을 참고로 함께 적는다(RSS는 공유 메모리를 포함해 크게 나온다는 점도 적는다).

- [ ] **Step 4: 측정 보고서 초안 작성과 커밋**

`docs/superpowers/reports/2026-10-03-plan2-risk-check.md`:
- 맨 위: 날짜, 기기(`sysctl -n machdep.cpu.brand_string`, `sw_vers -productVersion`), 커밋 해시
- 표: 항목 / 기준 / 결과 / 판단(통과·주의·실패)
- Step 1~3 결과
- 아래 Step 5~6 항목은 "PM과 확인 예정"으로 비워 둔다

```bash
git add docs/superpowers/reports/2026-10-03-plan2-risk-check.md
git commit -m "docs: 계획 2 위험 확인 — Mac 측정 결과"
```

- [ ] **Step 5: (controller + PM) 눈으로 보는 확인**

PM에게 앱을 실행해 달라고 하고(`open src-tauri/target/release/bundle/macos/TodoWidget.app`) 함께 확인한다. 화면 캡처는 PM이 원할 때 PM이 직접 한다.

| 항목 | 확인 방법 | spec |
|---|---|---|
| 투명한 둥근 카드와 그림자 | 바탕 화면 위에서 모서리 밖이 비치는지 | WND-01 |
| 투명도 슬라이더 | 40%로 올려 배경만 비치고 글자는 선명한지 | WND-13 |
| 헤더 끌어 옮기기 | 헤더를 끌어 이동 | WND-02 |
| 가장자리 크기 조절 | 오른쪽·아래·오른쪽 아래 모서리 | WND-03 |
| Dock·Cmd+Tab에 없음 | Dock과 Cmd+Tab 목록 | MAC-02 |
| 메뉴 막대 아이콘 | 왼쪽 클릭 → 앞으로, 오른쪽 클릭 → 열기·종료 | MAC-03, MAC-04 |
| 다시 열기 | 다른 창으로 가린 뒤 Spotlight로 다시 열기 | MAC-05 |
| 모든 데스크톱 | 데스크톱을 바꿔도 같은 자리 | MAC-06 |
| 전체 화면 위 | 📌 켬: 전체 화면 앱 위에 보임, 📌 끔: 안 보임 | MAC-07 |
| 한글 입력 | "보고서 쓰기" 입력 → 조합 중 Enter → 정확히 1개, 바로 다음 입력 | INPUT-05, INPUT-06 |
| 중국어 병음 | "nihao" → 你好 확정 → Enter → 1개 | INPUT-06 |

결과를 보고서에 적는다.

- [ ] **Step 6: (controller + PM, 승인 받은 뒤) ad-hoc 서명 앱의 로그인 항목 유지 (설계 문서 12장 위험)**

이 시험은 PM Mac에 로그인 항목을 실제로 등록하므로 **실행 전에 PM 승인을 받는다**. 끝나면 반드시 해제하고 지운다.

```bash
# 1) 버전 A를 응용 프로그램 폴더에 두고 등록
cp -R src-tauri/target/release/bundle/macos/TodoWidget.app /Applications/TodoWidget.app
/Applications/TodoWidget.app/Contents/MacOS/todo-widget --probe-login-item register
/Applications/TodoWidget.app/Contents/MacOS/todo-widget --probe-login-item status
# 2) 버전을 바꿔 다시 빌드 (tauri.conf.json의 version을 2.0.1로 잠시 바꾼 뒤 빌드, 끝나면 되돌린다)
# 3) 업데이트처럼 덮어쓰기
rm -rf /Applications/TodoWidget.app && cp -R src-tauri/target/release/bundle/macos/TodoWidget.app /Applications/TodoWidget.app
/Applications/TodoWidget.app/Contents/MacOS/todo-widget --probe-login-item status
# 4) 정리
/Applications/TodoWidget.app/Contents/MacOS/todo-widget --probe-login-item unregister
rm -rf /Applications/TodoWidget.app
```

`status` 값의 뜻: `0` 등록 안 됨, `1` 켜짐, `2` 승인 필요, `3` 찾을 수 없음. 1)에서 `1` 또는 `2`, 3)에서도 같은 값이면 유지되는 것이다. 3)에서 값이 바뀌면 MAC-08에 영향이 있으므로 보고서에 "실패"로 적고 대안(업데이트 뒤 다시 등록, START-03과 같은 흐름)을 함께 적는다.

---

### Task 8: 결과 반영과 PM 리뷰

**Files:**
- Modify: `docs/superpowers/reports/2026-10-03-plan2-risk-check.md`, `docs/superpowers/specs/2026-10-03-cross-platform-design.md`(11장·12장, 변경 이력), `spec/00-principles.md`(필요할 때만), `CLAUDE.md`(문서 지도)

- [ ] **Step 1: 설계 문서 12장에 결과 반영**

12장 표에 "결과" 칸을 더해 항목마다 통과·주의·실패와 보고서 링크를 적는다. 변경 이력에 한 줄 추가.

- [ ] **Step 2: 기준 숫자 조정안 (PM 결정)**

측정값이 PERF 기준과 크게 다르면, 바꿀 숫자와 이유를 보고서 끝 "PM 결정 필요"에 적는다. spec은 PM 승인 뒤에만 고친다.

- [ ] **Step 3: UPD-09 시험 빌드용 업데이트 주소 (계획 1에서 미룬 것)**

보고서 "PM 결정 필요"에 다음 제안을 적는다: "REL-10 시험 빌드는 빌드할 때 환경 변수 `TODOWIDGET_UPDATE_ENDPOINT`로 업데이트 확인 주소를 바꿀 수 있다. 출시 빌드는 이 변수를 쓰지 않는다(CI가 확인)." 승인되면 `spec/release.md`에 REL-10으로 추가한다.

- [ ] **Step 4: CLAUDE.md 문서 지도에 보고서 행 추가**

```markdown
| 계획 2 위험 확인 결과 | `docs/superpowers/reports/2026-10-03-plan2-risk-check.md` |
```

- [ ] **Step 5: 검사와 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check && cargo test --manifest-path src-tauri/Cargo.toml`
Expected: 모두 통과

```bash
git add -A
git commit -m "docs: 계획 2 위험 확인 결과를 설계 문서와 문서 지도에 반영"
```

- [ ] **Step 6: PM 리뷰와 push 여부**

PM에게 보고서를 보여 주고 다음을 정한다:
- "PM 결정 필요" 항목들
- `feat/cross-platform` 브랜치를 push해서 CI를 처음 돌릴지, 그리고 Windows 시험 설치 파일(workflow 수동 실행)을 만들어 PM이 Windows에서 같은 확인(투명 창, 시작 시간, 메모리, 한글 입력)을 할지

push와 workflow 실행은 PM이 승인한 뒤에만 한다.
