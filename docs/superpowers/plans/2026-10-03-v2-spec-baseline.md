# v2.0 spec 기준선 구현 계획 (계획 1/6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v1.4가 실제로 하는 일과 v2.0에서 새로 정한 일을 ID가 붙은 `spec/` 문서로 확정하고, spec 형식과 테스트 연결을 기계로 검사하는 도구를 만든다.

**Architecture:** `spec/`은 Markdown 문서이고, 요구사항 하나가 `### ID 제목` 제목과 `조건/동작/결과/확인` 목록으로 이루어진다. `tools/spec-check/`는 Node.js(TypeScript)로 쓴 작은 검사기로, spec 형식, ID 중복, 테스트·체크리스트 연결을 검사한다. 이 계획에서는 앱 코드를 쓰지 않는다.

**Tech Stack:** Node.js 25 (TypeScript 파일 직접 실행), pnpm 10.33.2, Vitest, TypeScript 5.9 (타입 검사만)

**Spec:** `docs/superpowers/specs/2026-10-03-cross-platform-design.md` (설계 문서). v1.4의 근거는 `src/TodoWidget.Core/`, `src/TodoWidget.App/`, `tests/TodoWidget.Core.Tests/`, `docs/superpowers/specs/2026-09-30-todo-widget-design.md`.

## 전체 로드맵

계획은 6개다. 각 계획은 앞 계획이 끝난 뒤에 쓴다. 뒤 계획은 이 계획이 만드는 spec ID를 가리키기 때문이다.

| # | 계획 | 결과물 |
|---|---|---|
| **1** | **spec 기준선 (이 문서)** | `spec/` 전체, `tools/spec-check/`, PM 승인 |
| 2 | 뼈대와 위험 확인 | Tauri v2 + Svelte 뼈대, 층 의존 lint, GitHub Actions(Windows·macOS), WPF 코드 제거(v1.4.0 태그로 보존), 설계 문서 12장 초기 확인을 Mac에서 실제로 해 보고 보고 |
| 3 | domain + application | 할 일 규칙, 섹션 높이 배분, 붙여넣기 해석, 저장 형식과 v1.4 변환, 시작 흐름, 업데이트 확인 흐름. 모두 가짜 port로 TDD |
| 4 | adapters + platform | Rust 안전한 쓰기, 자동 실행, 두 번 실행 방지, 창 제어, macOS 메뉴 막대와 Spaces, 언어 감지, updater adapter |
| 5 | presentation | ViewModel, Svelte 화면, OS별 테마, 4개 언어 사전 |
| 6 | 출시 | 릴리스 workflow, 업데이트 서명 키, README, 저장소 이름 변경, 체크리스트 진행, v2.0.0 |

## Global Constraints

- 문서와 화면 기준 언어는 한국어다. 커밋 메시지는 `docs:`·`feat:`·`test:`·`chore:` 같은 prefix 뒤에 한국어로 쓴다. `Co-Authored-By` 줄은 넣지 않는다.
- `package.json`의 `packageManager`는 `pnpm@10.33.2`다. 작업 전에 `corepack enable`을 한다. 설치 후 `pnpm-lock.yaml`의 `lockfileVersion`이 바뀌면 원인을 확인한다.
- Node.js가 `.ts` 파일을 직접 실행하므로 TypeScript는 지울 수 있는 문법만 쓴다(`enum`, constructor parameter property, `namespace` 금지). import에는 `.ts` 확장자를 붙인다.
- 요구사항 ID 형식은 `PREFIX-NN`(숫자 2~3자리)이다. 한 번 쓴 ID는 지우거나 다른 뜻으로 다시 쓰지 않는다. 요구사항을 없애면 제목을 `(폐기)`로 바꾸고 남겨 둔다.
- 문서별 ID prefix:

| 파일 | prefix |
|---|---|
| `spec/00-principles.md` | `PRIV`, `PERF` |
| `spec/behavior/tasks.md` | `TASK` |
| `spec/behavior/list.md` | `LIST` |
| `spec/behavior/input.md` | `INPUT` |
| `spec/behavior/window.md` | `WND` |
| `spec/behavior/startup.md` | `START` |
| `spec/behavior/storage.md` | `STORE` |
| `spec/behavior/i18n.md` | `I18N` |
| `spec/behavior/update.md` | `UPD` |
| `spec/platform/windows.md` | `WIN` |
| `spec/platform/macos.md` | `MAC` |
| `spec/release.md` | `REL` |

- 요구사항 하나의 형식 (`조건`, `동작`은 필요할 때만, `결과`와 `확인`은 반드시):

```markdown
### TASK-09 이미 끝낸 일을 다시 끝낸 일로 지정하면 아무것도 바뀌지 않는다
- 조건: 상태 `done`, 끝낸 시각 `2026-10-03T09:00:00+09:00`
- 동작: 상태를 `done`으로 지정한다
- 결과: 끝낸 시각은 그대로 `2026-10-03T09:00:00+09:00`이고, 저장도 화면 갱신도 일어나지 않는다
- 확인: 자동 테스트
```

- `확인` 값은 `자동 테스트` 또는 `직접 확인` 둘 중 하나다. `직접 확인` 요구사항은 같은 커밋에서 `spec/checklists/`에 같은 ID로 올린다. 공통 행동(`spec/behavior/`, `spec/00-principles.md`)은 `windows.md`와 `macos.md` 체크리스트 양쪽에, `WIN`은 `windows.md`에만, `MAC`은 `macos.md`에만 올린다.
- 문장은 짧고 평이하게 쓴다. v1.3 설계 문서의 말투를 따른다.

---

### Task 1: spec 형식 파서와 검사

**Files:**
- Create: `package.json`, `tsconfig.json`, `pnpm-lock.yaml`(자동 생성)
- Modify: `.gitignore`
- Create: `tools/spec-check/config.ts`
- Create: `tools/spec-check/parse.ts`
- Create: `tools/spec-check/validate.ts`
- Test: `tools/spec-check/parse.test.ts`, `tools/spec-check/validate.test.ts`

**Interfaces:**
- Produces:
  - `type Verify = 'auto' | 'manual'`
  - `interface Requirement { id: string; title: string; file: string; line: number; verify: Verify | null; fields: Record<string, string> }`
  - `interface SpecError { file: string; line: number; message: string }`
  - `parseSpec(markdown: string, file: string): { requirements: Requirement[]; errors: SpecError[] }`
  - `validateRequirements(requirements: Requirement[], prefixesByFile: Readonly<Record<string, readonly string[]>>): SpecError[]`
  - `PREFIXES_BY_FILE`, `ALL_PREFIXES`, `TEST_GLOBS`, `CHECKLIST_GLOB`, `SPEC_GLOB` (config.ts)

- [ ] **Step 1: 도구 준비**

```bash
cd /Users/hoyoungjeon/dev/todo/todo-widget
corepack enable
```

`package.json`:

```json
{
  "name": "todo-widget",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.33.2",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "spec:check": "node tools/spec-check/cli.ts",
    "spec:check:strict": "node tools/spec-check/cli.ts --strict"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["tools/**/*.ts"]
}
```

```bash
pnpm add -D vitest typescript@~5.9 @types/node
printf 'node_modules/\n' >> .gitignore
```

Expected: `pnpm-lock.yaml`이 생기고 `lockfileVersion: '9.0'`이다.

- [ ] **Step 2: 설정 파일 작성**

`tools/spec-check/config.ts`:

```ts
/** spec 파일마다 쓸 수 있는 ID prefix. 여기에 없는 spec 파일에는 요구사항을 둘 수 없다. */
export const PREFIXES_BY_FILE: Readonly<Record<string, readonly string[]>> = {
  'spec/00-principles.md': ['PRIV', 'PERF'],
  'spec/behavior/tasks.md': ['TASK'],
  'spec/behavior/list.md': ['LIST'],
  'spec/behavior/input.md': ['INPUT'],
  'spec/behavior/window.md': ['WND'],
  'spec/behavior/startup.md': ['START'],
  'spec/behavior/storage.md': ['STORE'],
  'spec/behavior/i18n.md': ['I18N'],
  'spec/behavior/update.md': ['UPD'],
  'spec/platform/windows.md': ['WIN'],
  'spec/platform/macos.md': ['MAC'],
  'spec/release.md': ['REL'],
};

export const ALL_PREFIXES: readonly string[] = Object.values(PREFIXES_BY_FILE).flat();

export const SPEC_GLOB = 'spec/**/*.md';

export const CHECKLIST_GLOB = 'spec/checklists/*.md';

/** 자동 테스트가 있는 곳. 테스트 이름이나 주석에 요구사항 ID를 적는다. */
export const TEST_GLOBS: readonly string[] = ['src/**/*.test.ts', 'src-tauri/src/**/*.rs'];
```

- [ ] **Step 3: 파서 테스트 작성**

`tools/spec-check/parse.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseSpec } from './parse.ts';

const FILE = 'spec/behavior/tasks.md';

describe('parseSpec', () => {
  it('### ID 제목과 아래 목록을 요구사항 하나로 읽는다', () => {
    const md = [
      '# 할 일',
      '',
      '### TASK-09 끝낸 일을 다시 끝내도 그대로다',
      '- 조건: 상태 `done`',
      '- 동작: `done`으로 지정한다',
      '- 결과: 끝낸 시각이 그대로다',
      '- 확인: 자동 테스트',
    ].join('\n');

    const { requirements, errors } = parseSpec(md, FILE);

    expect(errors).toEqual([]);
    expect(requirements).toEqual([
      {
        id: 'TASK-09',
        title: '끝낸 일을 다시 끝내도 그대로다',
        file: FILE,
        line: 3,
        verify: 'auto',
        fields: { 조건: '상태 `done`', 동작: '`done`으로 지정한다', 결과: '끝낸 시각이 그대로다', 확인: '자동 테스트' },
      },
    ]);
  });

  it('직접 확인은 manual이다', () => {
    const md = '### LIST-11 긴 제목은 줄바꿈된다\n- 결과: 전부 보인다\n- 확인: 직접 확인';
    expect(parseSpec(md, FILE).requirements[0]?.verify).toBe('manual');
  });

  it('알 수 없는 확인 값은 verify가 null이다', () => {
    const md = '### TASK-01 추가\n- 결과: 된다\n- 확인: 눈으로';
    expect(parseSpec(md, FILE).requirements[0]?.verify).toBeNull();
  });

  it('다른 제목이 나오면 앞 요구사항의 목록이 끝난다', () => {
    const md = '### TASK-01 추가\n- 결과: 된다\n\n## 다음 절\n- 확인: 자동 테스트';
    expect(parseSpec(md, FILE).requirements[0]?.fields).toEqual({ 결과: '된다' });
  });

  it('줄바꿈이 CRLF여도 읽는다', () => {
    const md = '### TASK-01 추가\r\n- 결과: 된다\r\n- 확인: 자동 테스트';
    expect(parseSpec(md, FILE).requirements[0]?.verify).toBe('auto');
  });

  it('ID처럼 생겼지만 형식이 틀린 제목은 오류다', () => {
    const md = '### TASK-7 숫자가 한 자리\n### TASK09 하이픈 없음\n### 일반 제목';
    const { requirements, errors } = parseSpec(md, FILE);

    expect(requirements).toEqual([]);
    expect(errors).toEqual([
      { file: FILE, line: 1, message: '요구사항 제목 형식이 아니에요: ### TASK-7 숫자가 한 자리' },
      { file: FILE, line: 2, message: '요구사항 제목 형식이 아니에요: ### TASK09 하이픈 없음' },
    ]);
  });
});
```

- [ ] **Step 4: 실패 확인**

Run: `pnpm vitest run tools/spec-check/parse.test.ts`
Expected: FAIL (`Cannot find module './parse.ts'` 또는 비슷한 오류)

- [ ] **Step 5: 파서 구현**

`tools/spec-check/parse.ts`:

```ts
export type Verify = 'auto' | 'manual';

export interface Requirement {
  id: string;
  title: string;
  file: string;
  line: number;
  verify: Verify | null;
  fields: Record<string, string>;
}

export interface SpecError {
  file: string;
  line: number;
  message: string;
}

const REQUIREMENT_HEADING = /^###\s+([A-Z][A-Z0-9]*-\d{2,3})\s+(.+?)\s*$/;
// 대문자 두 글자 이상으로 시작하는 단어 뒤에 숫자가 오면 요구사항을 쓰려던 것으로 본다.
const LOOKS_LIKE_REQUIREMENT = /^###\s+[A-Z]{2,}[A-Z0-9]*-?\d/;
const ANY_HEADING = /^#{1,6}\s/;
const FIELD = /^-\s+(조건|동작|결과|확인):\s*(.*?)\s*$/;
const VERIFY_VALUES: Readonly<Record<string, Verify>> = { '자동 테스트': 'auto', '직접 확인': 'manual' };

export function parseSpec(markdown: string, file: string): { requirements: Requirement[]; errors: SpecError[] } {
  const requirements: Requirement[] = [];
  const errors: SpecError[] = [];
  let current: Requirement | null = null;

  for (const [index, text] of markdown.split(/\r?\n/).entries()) {
    const line = index + 1;
    const heading = REQUIREMENT_HEADING.exec(text);
    if (heading) {
      current = { id: heading[1]!, title: heading[2]!, file, line, verify: null, fields: {} };
      requirements.push(current);
      continue;
    }
    if (ANY_HEADING.test(text)) {
      if (LOOKS_LIKE_REQUIREMENT.test(text))
        errors.push({ file, line, message: `요구사항 제목 형식이 아니에요: ${text}` });
      current = null;
      continue;
    }
    const field = FIELD.exec(text);
    if (current && field) {
      const [, name, value] = field as unknown as [string, string, string];
      current.fields[name] = value;
      if (name === '확인')
        current.verify = VERIFY_VALUES[value] ?? null;
    }
  }

  return { requirements, errors };
}
```

- [ ] **Step 6: 통과 확인**

Run: `pnpm vitest run tools/spec-check/parse.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 7: 검사 테스트 작성**

`tools/spec-check/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Requirement } from './parse.ts';
import { validateRequirements } from './validate.ts';

const PREFIXES = { 'spec/behavior/tasks.md': ['TASK'], 'spec/00-principles.md': ['PRIV', 'PERF'] };

function req(overrides: Partial<Requirement>): Requirement {
  return {
    id: 'TASK-01',
    title: '추가',
    file: 'spec/behavior/tasks.md',
    line: 1,
    verify: 'auto',
    fields: { 결과: '된다', 확인: '자동 테스트' },
    ...overrides,
  };
}

describe('validateRequirements', () => {
  it('올바른 요구사항은 오류가 없다', () => {
    expect(validateRequirements([req({}), req({ id: 'TASK-02', line: 5 })], PREFIXES)).toEqual([]);
  });

  it('한 파일에 prefix가 여러 개면 어느 것이든 쓸 수 있다', () => {
    const reqs = [
      req({ id: 'PRIV-01', file: 'spec/00-principles.md' }),
      req({ id: 'PERF-01', file: 'spec/00-principles.md', line: 9 }),
    ];
    expect(validateRequirements(reqs, PREFIXES)).toEqual([]);
  });

  it('같은 ID가 두 번 나오면 두 번째 위치를 알려 준다', () => {
    const errors = validateRequirements([req({}), req({ line: 7 })], PREFIXES);
    expect(errors).toEqual([
      { file: 'spec/behavior/tasks.md', line: 7, message: 'TASK-01이 중복돼요. 처음 나온 곳: spec/behavior/tasks.md:1' },
    ]);
  });

  it('파일에 맞지 않는 prefix는 오류다', () => {
    const errors = validateRequirements([req({ id: 'LIST-01' })], PREFIXES);
    expect(errors[0]?.message).toBe('LIST-01은 이 파일에 둘 수 없어요. 쓸 수 있는 prefix: TASK');
  });

  it('prefix 표에 없는 spec 파일에는 요구사항을 둘 수 없다', () => {
    const errors = validateRequirements([req({ file: 'spec/behavior/extra.md' })], PREFIXES);
    expect(errors[0]?.message).toBe('TASK-01: 요구사항을 둘 수 없는 파일이에요 (tools/spec-check/config.ts에 등록 필요)');
  });

  it('결과가 없으면 오류다', () => {
    const errors = validateRequirements([req({ fields: { 확인: '자동 테스트' } })], PREFIXES);
    expect(errors[0]?.message).toBe('TASK-01에 결과가 없어요');
  });

  it('확인이 없거나 값이 틀리면 오류다', () => {
    const missing = validateRequirements([req({ verify: null, fields: { 결과: '된다' } })], PREFIXES);
    const wrong = validateRequirements([req({ verify: null, fields: { 결과: '된다', 확인: '눈으로' } })], PREFIXES);
    expect(missing[0]?.message).toBe('TASK-01에 확인이 없어요');
    expect(wrong[0]?.message).toBe("TASK-01의 확인 값은 '자동 테스트' 또는 '직접 확인'이어야 해요: 눈으로");
  });
});
```

- [ ] **Step 8: 실패 확인**

Run: `pnpm vitest run tools/spec-check/validate.test.ts`
Expected: FAIL (`./validate.ts`를 찾지 못함)

- [ ] **Step 9: 검사 구현**

`tools/spec-check/validate.ts`:

```ts
import type { Requirement, SpecError } from './parse.ts';

export function validateRequirements(
  requirements: Requirement[],
  prefixesByFile: Readonly<Record<string, readonly string[]>>,
): SpecError[] {
  const errors: SpecError[] = [];
  const firstSeen = new Map<string, Requirement>();

  for (const req of requirements) {
    const at = (message: string): void => {
      errors.push({ file: req.file, line: req.line, message });
    };

    const first = firstSeen.get(req.id);
    if (first)
      at(`${req.id}이 중복돼요. 처음 나온 곳: ${first.file}:${first.line}`);
    else
      firstSeen.set(req.id, req);

    const allowed = prefixesByFile[req.file];
    const prefix = req.id.slice(0, req.id.lastIndexOf('-'));
    if (!allowed)
      at(`${req.id}: 요구사항을 둘 수 없는 파일이에요 (tools/spec-check/config.ts에 등록 필요)`);
    else if (!allowed.includes(prefix))
      at(`${req.id}은 이 파일에 둘 수 없어요. 쓸 수 있는 prefix: ${allowed.join(', ')}`);

    if (!req.fields['결과'])
      at(`${req.id}에 결과가 없어요`);

    const verify = req.fields['확인'];
    if (verify === undefined)
      at(`${req.id}에 확인이 없어요`);
    else if (req.verify === null)
      at(`${req.id}의 확인 값은 '자동 테스트' 또는 '직접 확인'이어야 해요: ${verify}`);
  }

  return errors;
}
```

- [ ] **Step 10: 통과 확인**

Run: `pnpm vitest run tools/spec-check && pnpm typecheck`
Expected: PASS (13 tests), 타입 오류 없음

- [ ] **Step 11: 커밋**

```bash
git add package.json pnpm-lock.yaml tsconfig.json .gitignore tools/spec-check/config.ts tools/spec-check/parse.ts tools/spec-check/parse.test.ts tools/spec-check/validate.ts tools/spec-check/validate.test.ts
git commit -m "feat: spec 요구사항 파서와 형식 검사 추가"
```

---

### Task 2: 테스트·체크리스트 연결 검사와 CLI

**Files:**
- Create: `tools/spec-check/links.ts`, `tools/spec-check/coverage.ts`, `tools/spec-check/check.ts`, `tools/spec-check/cli.ts`
- Test: `tools/spec-check/links.test.ts`, `tools/spec-check/coverage.test.ts`, `tools/spec-check/check.test.ts`

**Interfaces:**
- Consumes: `parseSpec`, `validateRequirements`, `Requirement`, `SpecError`, config 상수 (Task 1)
- Produces:
  - `interface Reference { id: string; file: string; line: number }`
  - `findReferences(text: string, file: string, prefixes: readonly string[]): Reference[]`
  - `interface CoverageReport { unknown: Reference[]; unlinkedAuto: Requirement[]; unlinkedManual: Requirement[] }`
  - `checkCoverage(requirements: Requirement[], testRefs: Reference[], checklistRefs: Reference[]): CoverageReport`
  - `interface CheckResult { requirements: Requirement[]; errors: SpecError[]; coverage: CoverageReport; exitCode: 0 | 1 }`
  - `runSpecCheck(root: string, options: { strict: boolean }): CheckResult`
  - `formatResult(result: CheckResult, strict: boolean): string`
  - 명령: `pnpm spec:check` (형식 오류, 없는 ID 참조, 체크리스트에 없는 직접 확인 항목이 있으면 실패), `pnpm spec:check:strict` (테스트가 없는 자동 테스트 항목까지 실패)

- [ ] **Step 1: 참조 찾기 테스트 작성**

`tools/spec-check/links.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findReferences } from './links.ts';

const PREFIXES = ['TASK', 'STORE', 'I18N'];

describe('findReferences', () => {
  it('등록된 prefix의 ID를 줄 번호와 함께 찾는다', () => {
    const text = "it('TASK-09 끝낸 일을 다시 끝내도 그대로다', () => {});\n\n/// STORE-03 안전한 쓰기";
    expect(findReferences(text, 'a.test.ts', PREFIXES)).toEqual([
      { id: 'TASK-09', file: 'a.test.ts', line: 1 },
      { id: 'STORE-03', file: 'a.test.ts', line: 3 },
    ]);
  });

  it('한 줄에 여러 ID가 있으면 모두 찾는다', () => {
    const refs = findReferences('- [ ] TASK-01, TASK-02 추가', 'c.md', PREFIXES);
    expect(refs.map((r) => r.id)).toEqual(['TASK-01', 'TASK-02']);
  });

  it('숫자가 들어간 prefix도 찾는다', () => {
    expect(findReferences('I18N-04', 'b.md', PREFIXES).map((r) => r.id)).toEqual(['I18N-04']);
  });

  it('등록되지 않은 prefix나 자릿수가 맞지 않는 것은 무시한다', () => {
    const text = 'UTF-8, ISO-8601, LIST-01, TASK-1, TASK-1234, XTASK-01';
    expect(findReferences(text, 'b.md', PREFIXES)).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tools/spec-check/links.test.ts`
Expected: FAIL (`./links.ts`를 찾지 못함)

- [ ] **Step 3: 참조 찾기 구현**

`tools/spec-check/links.ts`:

```ts
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
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run tools/spec-check/links.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 연결 검사 테스트 작성**

`tools/spec-check/coverage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkCoverage } from './coverage.ts';
import type { Reference } from './links.ts';
import type { Requirement } from './parse.ts';

function req(id: string, verify: 'auto' | 'manual'): Requirement {
  return { id, title: id, file: 'spec/behavior/tasks.md', line: 1, verify, fields: {} };
}

function ref(id: string, file = 'x'): Reference {
  return { id, file, line: 1 };
}

describe('checkCoverage', () => {
  it('자동 테스트 항목은 테스트에서, 직접 확인 항목은 체크리스트에서 참조돼야 연결된다', () => {
    const reqs = [req('TASK-01', 'auto'), req('TASK-02', 'manual')];
    const report = checkCoverage(reqs, [ref('TASK-01')], [ref('TASK-02')]);
    expect(report).toEqual({ unknown: [], unlinkedAuto: [], unlinkedManual: [] });
  });

  it('자리가 바뀐 참조는 연결로 치지 않는다', () => {
    const reqs = [req('TASK-01', 'auto'), req('TASK-02', 'manual')];
    const report = checkCoverage(reqs, [ref('TASK-02')], [ref('TASK-01')]);
    expect(report.unlinkedAuto.map((r) => r.id)).toEqual(['TASK-01']);
    expect(report.unlinkedManual.map((r) => r.id)).toEqual(['TASK-02']);
  });

  it('spec에 없는 ID를 가리키는 참조를 모은다', () => {
    const report = checkCoverage([req('TASK-01', 'auto')], [ref('TASK-01'), ref('TASK-99', 't')], [ref('TASK-98', 'c')]);
    expect(report.unknown).toEqual([ref('TASK-99', 't'), ref('TASK-98', 'c')]);
  });

  it('확인 값이 잘못된 요구사항은 연결 검사에서 뺀다 (형식 검사가 이미 알린다)', () => {
    const broken: Requirement = { ...req('TASK-03', 'auto'), verify: null };
    expect(checkCoverage([broken], [], [])).toEqual({ unknown: [], unlinkedAuto: [], unlinkedManual: [] });
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `pnpm vitest run tools/spec-check/coverage.test.ts`
Expected: FAIL (`./coverage.ts`를 찾지 못함)

- [ ] **Step 7: 연결 검사 구현**

`tools/spec-check/coverage.ts`:

```ts
import type { Reference } from './links.ts';
import type { Requirement } from './parse.ts';

export interface CoverageReport {
  /** spec에 없는 ID를 가리키는 참조 */
  unknown: Reference[];
  /** 테스트에서 참조되지 않은 자동 테스트 항목 */
  unlinkedAuto: Requirement[];
  /** 체크리스트에 없는 직접 확인 항목 */
  unlinkedManual: Requirement[];
}

export function checkCoverage(
  requirements: Requirement[],
  testRefs: Reference[],
  checklistRefs: Reference[],
): CoverageReport {
  const known = new Set(requirements.map((r) => r.id));
  const tested = new Set(testRefs.map((r) => r.id));
  const listed = new Set(checklistRefs.map((r) => r.id));

  return {
    unknown: [...testRefs, ...checklistRefs].filter((r) => !known.has(r.id)),
    unlinkedAuto: requirements.filter((r) => r.verify === 'auto' && !tested.has(r.id)),
    unlinkedManual: requirements.filter((r) => r.verify === 'manual' && !listed.has(r.id)),
  };
}
```

- [ ] **Step 8: 통과 확인**

Run: `pnpm vitest run tools/spec-check/coverage.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 9: 전체 검사 테스트 작성**

`tools/spec-check/check.test.ts`:

```ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatResult, runSpecCheck } from './check.ts';

let root: string;

function write(relative: string, content: string): void {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'spec-check-'));
  write(
    'spec/behavior/tasks.md',
    [
      '### TASK-01 추가',
      '- 결과: 된다',
      '- 확인: 자동 테스트',
      '',
      '### TASK-02 줄바꿈 표시',
      '- 결과: 보인다',
      '- 확인: 직접 확인',
    ].join('\n'),
  );
  write('spec/checklists/windows.md', '- [ ] TASK-02 줄바꿈 표시');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('runSpecCheck', () => {
  it('테스트가 아직 없으면 기본 모드는 통과하고 strict 모드는 실패한다', () => {
    expect(runSpecCheck(root, { strict: false }).exitCode).toBe(0);
    const strict = runSpecCheck(root, { strict: true });
    expect(strict.exitCode).toBe(1);
    expect(strict.coverage.unlinkedAuto.map((r) => r.id)).toEqual(['TASK-01']);
  });

  it('테스트가 생기면 strict 모드도 통과한다', () => {
    write('src/domain/todo-list.test.ts', "it('TASK-01 추가', () => {});");
    expect(runSpecCheck(root, { strict: true }).exitCode).toBe(0);
  });

  it('Rust 테스트의 주석도 참조로 센다', () => {
    write('src-tauri/src/fs.rs', '/// TASK-01 추가\n#[test]\nfn adds() {}');
    expect(runSpecCheck(root, { strict: true }).exitCode).toBe(0);
  });

  it('직접 확인 항목이 체크리스트에 없으면 기본 모드도 실패한다', () => {
    write('spec/checklists/windows.md', '');
    const result = runSpecCheck(root, { strict: false });
    expect(result.exitCode).toBe(1);
    expect(result.coverage.unlinkedManual.map((r) => r.id)).toEqual(['TASK-02']);
  });

  it('형식 오류나 없는 ID 참조가 있으면 실패한다', () => {
    write('spec/behavior/tasks.md', '### TASK-01 추가\n- 결과: 된다');
    expect(runSpecCheck(root, { strict: false }).errors[0]?.message).toBe('TASK-01에 확인이 없어요');

    write('spec/behavior/tasks.md', '### TASK-01 추가\n- 결과: 된다\n- 확인: 자동 테스트');
    write('spec/checklists/windows.md', '- [ ] TASK-77 없는 항목');
    const result = runSpecCheck(root, { strict: false });
    expect(result.exitCode).toBe(1);
    expect(result.coverage.unknown.map((r) => r.id)).toEqual(['TASK-77']);
  });

  it('체크리스트 파일 안의 형식 오류는 spec 형식 검사 대상이 아니다', () => {
    write('spec/checklists/macos.md', '### MAC-1 이런 제목도 체크리스트에서는 괜찮다');
    expect(runSpecCheck(root, { strict: false }).errors).toEqual([]);
  });

  it('결과를 사람이 읽을 수 있게 요약한다', () => {
    const text = formatResult(runSpecCheck(root, { strict: false }), false);
    expect(text).toContain('요구사항 2개 (자동 테스트 1, 직접 확인 1)');
    expect(text).toContain('테스트 없는 자동 테스트 항목 1개: TASK-01');
  });
});
```

- [ ] **Step 10: 실패 확인**

Run: `pnpm vitest run tools/spec-check/check.test.ts`
Expected: FAIL (`./check.ts`를 찾지 못함)

- [ ] **Step 11: 전체 검사와 CLI 구현**

`tools/spec-check/check.ts`:

```ts
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_PREFIXES, CHECKLIST_GLOB, PREFIXES_BY_FILE, SPEC_GLOB, TEST_GLOBS } from './config.ts';
import { type CoverageReport, checkCoverage } from './coverage.ts';
import { type Reference, findReferences } from './links.ts';
import { type Requirement, type SpecError, parseSpec } from './parse.ts';
import { validateRequirements } from './validate.ts';

export interface CheckResult {
  requirements: Requirement[];
  errors: SpecError[];
  coverage: CoverageReport;
  exitCode: 0 | 1;
}

export function runSpecCheck(root: string, options: { strict: boolean }): CheckResult {
  const checklists = new Set(files(root, [CHECKLIST_GLOB]));
  const requirements: Requirement[] = [];
  const errors: SpecError[] = [];

  for (const file of files(root, [SPEC_GLOB])) {
    if (checklists.has(file))
      continue;
    const parsed = parseSpec(read(root, file), file);
    requirements.push(...parsed.requirements);
    errors.push(...parsed.errors);
  }
  errors.push(...validateRequirements(requirements, PREFIXES_BY_FILE));

  const coverage = checkCoverage(
    requirements,
    references(root, files(root, TEST_GLOBS)),
    references(root, [...checklists]),
  );

  const failed =
    errors.length > 0
    || coverage.unknown.length > 0
    || coverage.unlinkedManual.length > 0
    || (options.strict && coverage.unlinkedAuto.length > 0);

  return { requirements, errors, coverage, exitCode: failed ? 1 : 0 };
}

export function formatResult(result: CheckResult, strict: boolean): string {
  const { requirements, errors, coverage } = result;
  const auto = requirements.filter((r) => r.verify === 'auto').length;
  const manual = requirements.filter((r) => r.verify === 'manual').length;
  const lines = [`요구사항 ${requirements.length}개 (자동 테스트 ${auto}, 직접 확인 ${manual})`];

  for (const e of errors)
    lines.push(`오류 ${e.file}:${e.line} ${e.message}`);
  for (const r of coverage.unknown)
    lines.push(`오류 ${r.file}:${r.line} spec에 없는 ID를 가리켜요: ${r.id}`);
  if (coverage.unlinkedManual.length > 0)
    lines.push(`오류 체크리스트에 없는 직접 확인 항목 ${coverage.unlinkedManual.length}개: ${ids(coverage.unlinkedManual)}`);
  if (coverage.unlinkedAuto.length > 0)
    lines.push(`${strict ? '오류' : '안내'} 테스트 없는 자동 테스트 항목 ${coverage.unlinkedAuto.length}개: ${ids(coverage.unlinkedAuto)}`);

  lines.push(result.exitCode === 0 ? '통과' : '실패');
  return lines.join('\n');
}

function files(root: string, patterns: readonly string[]): string[] {
  return patterns
    .flatMap((pattern) => globSync(pattern, { cwd: root }))
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
}

function read(root: string, file: string): string {
  return readFileSync(join(root, file), 'utf8');
}

function references(root: string, list: string[]): Reference[] {
  return list.flatMap((file) => findReferences(read(root, file), file, ALL_PREFIXES));
}

function ids(requirements: Requirement[]): string {
  return requirements.map((r) => r.id).join(', ');
}
```

`tools/spec-check/cli.ts`:

```ts
import { formatResult, runSpecCheck } from './check.ts';

const strict = process.argv.includes('--strict');
const result = runSpecCheck(process.cwd(), { strict });
console.log(formatResult(result, strict));
process.exitCode = result.exitCode;
```

- [ ] **Step 12: 통과 확인**

Run: `pnpm test && pnpm typecheck`
Expected: PASS (28 tests), 타입 오류 없음

Run: `pnpm spec:check`
Expected: `요구사항 0개 (자동 테스트 0, 직접 확인 0)` 다음 줄에 `통과`

- [ ] **Step 13: 커밋**

```bash
git add tools/spec-check package.json
git commit -m "feat: spec ID와 테스트·체크리스트 연결 검사 추가"
```

---

### Task 3: 설계 문서 정리와 spec 뼈대

설계 문서 4장의 예시와 prefix 목록을 이 계획의 형식에 맞추고, `spec/` 뼈대와 원칙 문서를 만든다.

**Files:**
- Modify: `docs/superpowers/specs/2026-10-03-cross-platform-design.md` (4.1 문서 구성, 4.2 요구사항 형식, 변경 이력)
- Create: `spec/README.md`, `spec/00-principles.md`, `spec/checklists/windows.md`, `spec/checklists/macos.md`

**Interfaces:**
- Produces: `spec/` 폴더 구조, 체크리스트 파일 두 개(뒤 Task들이 항목을 추가한다), `PRIV-01`, `PERF-01`~`PERF-05`

- [ ] **Step 1: 설계 문서 수정**

4.1 문서 구성 표에 `startup.md`(시작, 자동 실행, 두 번 실행, 종료)를 `window.md` 아래에 추가하고 `spec/README.md`를 맨 위에 추가한다. 4.2를 다음으로 바꾼다.
- 예시를 Global Constraints의 `### TASK-09 ...` 형식으로 바꾼다.
- prefix 목록을 Global Constraints의 표로 바꾼다(`WND`는 창, `WIN`은 Windows 플랫폼, `START`는 시작).
- "CI가 연결을 검사한다" 문단 끝에 "`pnpm spec:check`는 형식, 없는 ID 참조, 체크리스트 누락을 검사하고, `pnpm spec:check:strict`는 테스트 없는 자동 테스트 항목까지 실패로 본다. 출시 전에는 strict가 통과해야 한다."를 덧붙인다.

변경 이력에 한 줄을 추가한다: `- 2026-10-03: spec 형식을 '### ID 제목' 제목으로 정하고, prefix를 정리했다(창 WND, Windows WIN, 시작 START 추가).`

- [ ] **Step 2: `spec/README.md` 작성**

내용:
- 이 폴더가 v2.0 동작의 기준이라는 것. 코드와 다르면 코드가 틀린 것.
- 파일 목록과 각 파일이 다루는 것 (Global Constraints의 prefix 표 + `checklists/`).
- 요구사항 형식 (Global Constraints의 예시 그대로)과 `확인` 값 두 가지의 뜻.
- 테스트에서 ID를 쓰는 법: TypeScript는 `it('TASK-09 ...')`처럼 테스트 이름 앞에, Rust는 테스트 함수 위 `/// STORE-03 ...` 주석에.
- 바꾸는 순서: spec 수정 → PM 승인 → 실패하는 테스트 → 구현 → 리팩터링. 문서마다 맨 위 변경 이력에 날짜와 내용을 적는다.
- ID 규칙: 지우거나 다시 쓰지 않는다. 없앨 때는 제목을 `(폐기)`로 바꾼다.
- 검사 명령 두 가지와 차이.

- [ ] **Step 3: 체크리스트 뼈대 작성**

`spec/checklists/windows.md`:

```markdown
# Windows 직접 확인 체크리스트

출시 후보 빌드를 Windows 10 또는 11 (x64)에 설치하고 확인한다. 항목마다 spec ID를 적는다. 확인한 사람과 날짜, 빌드 버전을 맨 아래에 적는다.

## 원칙과 성능

## 할 일 목록

## 입력

## 창

## 시작과 종료

## 저장

## 다국어

## 업데이트

## Windows 전용

## 출시

---
확인: (이름) / (날짜) / (버전)
```

`spec/checklists/macos.md`: 같은 구조로 쓰고, 제목은 `# macOS 직접 확인 체크리스트`, 첫 문단의 대상은 "macOS (Apple Silicon 또는 Intel)", `## Windows 전용` 대신 `## macOS 전용`.

- [ ] **Step 4: `spec/00-principles.md` 작성**

맨 위: 제목, 변경 이력(`- 2026-10-03: 처음 작성 (v2.0 기준)`).

**제품 원칙** (요구사항 아님, 문장으로):
- 늘 떠 있는 작은 위젯으로, 남은 일을 한눈에 보여 준다. 성공 기준은 설계 문서 1장.
- 행동은 두 OS가 같게, 겉모양은 각 OS에 맞게.
- 배경 투명도는 필수 기능이다. App Store 배포는 하지 않는다.
- 혼자 또는 지인 몇 명이 각자 PC에서 쓴다. 동기화·공유·계정은 없다.

**개발 원칙** (요구사항 아님): CLAUDE.md "작업 규칙"과 설계 문서 5장 요약. spec 먼저, TDD, 층 구조와 의존 방향, OS 의존 코드 위치 제한, port 주입, 전역 singleton 금지.

**요구사항:**

| ID | 제목 | 결과의 핵심 | 확인 |
|---|---|---|---|
| PRIV-01 | 사용자 데이터는 기기 밖으로 나가지 않는다 | 네트워크 요청은 updater adapter만 하고, 요청에 할 일·설정·사용 기록을 담지 않는다. 다른 코드에서 `fetch`, `XMLHttpRequest`, `WebSocket`, Tauri http plugin을 쓰지 않는다 | 자동 테스트 |
| PERF-01 | 켜고 1초 안에 위젯이 보인다 | 실행부터 위젯이 화면에 그려질 때까지 1초 이내 | 직접 확인 |
| PERF-02 | 조작 결과가 바로 보인다 | 추가·상태 변경·접기 후 체감 지연 없이 화면에 반영된다 | 직접 확인 |
| PERF-03 | 가만히 있을 때 CPU를 거의 쓰지 않는다 | 조작 없이 1분 동안 CPU 평균 1% 미만 | 직접 확인 |
| PERF-04 | 가만히 있을 때 메모리가 기준 이하다 | 관련 프로세스 합 Windows 150MB 이하, macOS 120MB 이하 | 직접 확인 |
| PERF-05 | 설치 파일이 작다 | Windows 설치 파일과 macOS dmg가 각각 15MB 이하 | 자동 테스트 |

각 요구사항을 Global Constraints 형식으로 풀어 쓴다(`조건`/`동작`은 필요한 것만). PERF 항목 아래에 "이 숫자는 2026-10-03 PM과 정한 잠정 기준이다. 계획 2에서 실제로 재 보고 크게 다르면 다시 정한다."를 둔다.

**범위 밖:** 설계 문서 3장 "제외" 목록 그대로.
**다음 버전 후보:** 설계 문서 3장 그대로 (전체 화면에서 비켜 주기 + PM 의견, 메뉴 막대 남은 개수).

- [ ] **Step 5: 체크리스트에 직접 확인 항목 추가**

두 체크리스트의 `## 원칙과 성능`에 PERF-01~04를 한 줄씩 추가한다. 형식: `- [ ] PERF-01 켜고 1초 안에 위젯이 보인다 — 실행 후 위젯이 그려질 때까지 시간을 잰다`

- [ ] **Step 6: 검사**

Run: `pnpm spec:check`
Expected: `요구사항 6개 (자동 테스트 2, 직접 확인 4)`, `안내 테스트 없는 자동 테스트 항목 2개: PRIV-01, PERF-05`, `통과`

- [ ] **Step 7: 커밋**

```bash
git add docs/superpowers/specs/2026-10-03-cross-platform-design.md spec
git commit -m "docs: spec 폴더 뼈대와 원칙 문서 추가"
```

---

### Task 4: `behavior/tasks.md`와 `behavior/list.md`

**Files:**
- Create: `spec/behavior/tasks.md`, `spec/behavior/list.md`
- Modify: `spec/checklists/windows.md`, `spec/checklists/macos.md` (`## 할 일 목록`)

**근거:** `src/TodoWidget.Core/TodoList.cs`, `TodoItem.cs`, `SectionLayout.cs`, `src/TodoWidget.App/MainViewModel.cs`, `tests/TodoWidget.Core.Tests/TodoListTests.cs`, `SectionLayoutTests.cs`, v1.3 설계 2장·3.2·3.3. v1.4 테스트 이름과 아래 요구사항이 하나씩 대응하는지 확인하면서 쓴다.

- [ ] **Step 1: `spec/behavior/tasks.md` 작성**

맨 위: 제목 "할 일과 상태", 변경 이력, 용어 표(저장값 `todo`/`doing`/`done` ↔ 화면 이름은 I18N 사전 키 `status.todo`/`status.doing`/`status.done`).

| ID | 제목 | 결과의 핵심 | 확인 |
|---|---|---|---|
| TASK-01 | 새 할 일은 할 일 상태로 만들어진다 | 상태 `todo`, 만든 시각 = 지금, 끝낸 시각 없음 | 자동 테스트 |
| TASK-02 | 할 일마다 서로 다른 id를 가진다 | id는 GUID 문자열이고 겹치지 않는다 | 자동 테스트 |
| TASK-03 | 제목의 공백을 정리한다 | 줄바꿈·탭·연속 공백은 공백 하나로, 앞뒤 공백은 지운다. 예: `"  보고서\n  쓰기\t "` → `"보고서 쓰기"` | 자동 테스트 |
| TASK-04 | 정리하고 나서 빈 제목이면 추가하지 않는다 | `""`, `"   "`, `"\n\t"`는 아무것도 추가하지 않는다 | 자동 테스트 |
| TASK-05 | 상태는 할 일 → 하는 중 → 끝낸 일 → 할 일로 돈다 | 순환 3번이면 처음 상태로 돌아온다 | 자동 테스트 |
| TASK-06 | 끝낸 일이 되면 끝낸 시각을 기록한다 | 끝낸 시각 = 지금 | 자동 테스트 |
| TASK-07 | 끝낸 일에서 벗어나면 끝낸 시각을 지운다 | 다른 상태로 바뀌면 끝낸 시각 없음 | 자동 테스트 |
| TASK-08 | 다시 끝내면 새 시각을 기록한다 | 이전 시각이 아닌 지금 | 자동 테스트 |
| TASK-09 | 이미 끝낸 일을 다시 끝낸 일로 지정하면 아무것도 바뀌지 않는다 | 끝낸 시각 그대로, 변경 없음으로 처리 | 자동 테스트 |
| TASK-10 | 상태를 바로 지정할 수 있다 | 세 상태 중 어느 것으로든 한 번에 바뀌고 TASK-06~09 규칙을 따른다. 같은 상태로 지정하면 변경 없음 | 자동 테스트 |
| TASK-11 | 이름을 바꿀 때도 같은 정리 규칙을 쓴다 | TASK-03과 같은 정리 후 저장 | 자동 테스트 |
| TASK-12 | 빈 제목으로는 이름을 바꿀 수 없다 | 원래 제목 유지, 변경 없음 | 자동 테스트 |
| TASK-13 | 할 일을 삭제한다 | 목록에서 사라진다 | 자동 테스트 |
| TASK-14 | 모두 지우면 상태와 관계없이 전부 사라진다 | 모든 할 일 삭제. 이미 비어 있으면 변경 없음 | 자동 테스트 |
| TASK-15 | 없는 id로 조작하면 아무것도 바뀌지 않는다 | 순환·지정·이름 바꾸기·삭제 모두 변경 없음 | 자동 테스트 |
| TASK-16 | 남은 개수는 할 일과 하는 중의 합이다 | 끝낸 일은 세지 않는다 | 자동 테스트 |

"변경 없음"의 뜻을 문서 앞부분에 정의한다: 저장하지 않고 화면도 갱신하지 않는다(STORE-02와 연결).

- [ ] **Step 2: `spec/behavior/list.md` 작성**

맨 위: 제목 "목록 화면", 변경 이력, 화면 구성 그림(헤더 / 끝낸 일 섹션 / 할 일 섹션 / 안내 줄 / 입력칸)을 텍스트로.

| ID | 제목 | 결과의 핵심 | 확인 |
|---|---|---|---|
| LIST-01 | 섹션은 위에서부터 끝낸 일, 할 일 순서다 | 항목이 0개인 섹션은 숨긴다 | 자동 테스트 |
| LIST-02 | 할 일 섹션은 하는 중이 위, 할 일이 아래다 | 각각 만든 시각이 오래된 것이 위 | 자동 테스트 |
| LIST-03 | 같은 초에 만든 할 일은 추가한 순서를 지킨다 | 만든 시각이 같으면 목록에 들어온 순서 | 자동 테스트 |
| LIST-04 | 끝낸 일은 최근에 끝낸 것이 위다 | 끝낸 시각을 실제 시각으로 비교한다. 시간대가 다른 기록이 섞여도 맞다 | 자동 테스트 |
| LIST-05 | 끝낸 시각이 없는 끝낸 일은 맨 아래다 | v1.4 파일에서 온 경우 등 | 자동 테스트 |
| LIST-06 | 헤더에 남은 개수를 보여 준다 | `header.remaining`("N개 남음"), 0개면 `header.allDone`("모두 끝냈어요") | 자동 테스트 |
| LIST-07 | 끝낸 일 섹션은 접어 둘 수 있다 | 제목 줄 "끝낸 일 N · 펼치기/접기"를 누르면 바뀐다. 기본은 접힘 | 자동 테스트 |
| LIST-08 | 할 일 섹션은 접어 둘 수 있다 | 제목 줄 "할 일 N"(N = 하는 중 포함)을 누르면 바뀐다. 접혀도 개수는 보인다. 기본은 펼침 | 자동 테스트 |
| LIST-09 | 접힘 상태는 다음 실행 때 복원된다 | 바꿀 때마다 `settings.json`의 `doneExpanded`, `todoExpanded`에 저장 | 자동 테스트 |
| LIST-10 | 할 일이 하나도 없으면 안내를 보여 준다 | 목록 자리에 `list.empty`("할 일을 추가해 보세요") | 자동 테스트 |
| LIST-11 | 긴 제목은 줄바꿈해서 전부 보여 준다 | 말줄임 없이 여러 줄 | 직접 확인 |
| LIST-12 | 상태마다 표시가 다르다 | 할 일 = 회색 빈 원, 하는 중 = 주황 점 + 주황 배경, 끝낸 일 = 초록 원 + 흐린 제목 + 가운데 줄. 할 일 섹션 점은 주황, 끝낸 일 섹션 점은 초록 | 직접 확인 |
| LIST-13 | 높이가 넉넉하면 섹션마다 필요한 만큼 쓴다 | 최대 높이가 없거나 합이 들어가면 각자 필요한 높이 | 자동 테스트 |
| LIST-14 | 높이가 모자라면 짧은 섹션은 다 보이고 긴 섹션들이 나머지를 똑같이 나눈다 | v1.4 `SectionLayout.Allocate`와 같은 결과. 배분 합은 가용 높이와 같다 | 자동 테스트 |
| LIST-15 | 섹션은 최소 높이 아래로 줄지 않는다 | 최소 높이 = 제목 줄 + 첫 항목. 최소 높이 합이 가용 높이보다 크면 최소 높이를 준다. 접힌 섹션은 제목 줄 높이만 쓴다 | 자동 테스트 |
| LIST-16 | 섹션마다 따로 스크롤한다 | 줄어든 섹션은 자기 영역 안에서 스크롤하고, 스크롤바는 얇다 | 직접 확인 |

LIST-14 아래에 v1.4 `SectionLayoutTests.cs`의 예시 숫자 중 세 개(다 들어감, 짧은 것 하나 + 긴 것 하나, 긴 것 둘)를 `조건`/`결과`에 그대로 옮긴다.

- [ ] **Step 3: 체크리스트에 추가**

두 체크리스트 `## 할 일 목록`에 LIST-11, LIST-12, LIST-16을 Task 3 Step 5 형식으로 추가한다.

- [ ] **Step 4: 검사**

Run: `pnpm spec:check`
Expected: `요구사항 38개 (자동 테스트 31, 직접 확인 7)`, `통과`

- [ ] **Step 5: 커밋**

```bash
git add spec
git commit -m "docs: 할 일 규칙과 목록 화면 spec 작성 (v1.4 역 spec화)"
```

---

### Task 5: `behavior/input.md`

**Files:**
- Create: `spec/behavior/input.md`
- Modify: 두 체크리스트 `## 입력`

**근거:** `TodoList.AddLines`, `StripBullet`, `TodoSession.Add`, `MainWindow.xaml.cs`의 `AddBox_*`, `EditBox_*`, `TextBox_Pasting`, `StatusMark_Click`, `MenuRename_Click`, `Title_MouseLeftButtonDown`, `ResetMenuItem_Click`·`ResetConfirm_*`, `MainWindow.xaml` 112행(`초기화`는 할 일이 있을 때만), v1.3 설계 3.4.

- [ ] **Step 1: 작성**

맨 위: 제목 "입력과 조작", 변경 이력. "IME 조합 중"의 뜻을 정의한다(한글·병음 입력기가 글자를 아직 확정하지 않은 상태).

| ID | 제목 | 결과의 핵심 | 확인 |
|---|---|---|---|
| INPUT-01 | 입력칸은 항상 맨 아래에 떠 있다 | 비어 있으면 `input.placeholder`("할 일 추가")를 흐리게 보여 준다 | 자동 테스트 |
| INPUT-02 | Enter를 누르면 추가하고 입력칸을 비운다 | 포커스는 입력칸에 남아 이어서 입력할 수 있다 | 자동 테스트 |
| INPUT-03 | 빈 입력에서 Enter는 아무것도 하지 않는다 | 공백만 있어도 추가하지 않고 입력칸도 그대로 | 자동 테스트 |
| INPUT-04 | Esc를 누르면 입력하던 글자를 지운다 | 입력칸이 빈다 | 자동 테스트 |
| INPUT-05 | IME 조합 중 Enter는 조합을 끝낸 뒤 정확히 하나를 추가한다 | 마지막 글자가 빠지거나 두 번 추가되지 않는다. 조합을 확정하는 Enter 자체로는 추가하지 않고, 확정된 뒤의 Enter로 추가한다. 둘 중 어느 방식인지는 OS 입력기 관례를 따르되 결과는 "보고서 쓰기" 1개 | 자동 테스트 |
| INPUT-06 | IME 조합 중 Enter를 실제 입력기로 확인한다 | 한글 두벌식, 중국어 병음 각각 "입력 → Enter → 바로 다음 입력"이 끊기지 않는다 | 직접 확인 |
| INPUT-07 | 여러 줄을 붙여 넣으면 줄마다 하나씩 바로 추가한다 | 입력칸에는 넣지 않는다. 붙여 넣은 순서대로 보인다 | 자동 테스트 |
| INPUT-08 | 여러 줄 붙여넣기에서 빈 줄은 건너뛴다 | 빈 줄·공백 줄은 할 일이 되지 않는다 | 자동 테스트 |
| INPUT-09 | 줄 앞의 목록 기호 `-`, `•` 하나를 뗀다 | 앞 공백을 지운 뒤 맨 앞 기호 하나만 뗀다. `1.` 같은 숫자는 남긴다. 기호만 있는 줄은 건너뛴다 | 자동 테스트 |
| INPUT-10 | 한 줄 붙여넣기는 입력칸에 그대로 들어간다 | 줄바꿈이 없으면 일반 붙여넣기 | 자동 테스트 |
| INPUT-11 | 동그라미를 누르면 상태가 한 단계 바뀐다 | TASK-05 순서. 다른 할 일의 이름을 바꾸던 중이면 그것을 먼저 저장한다 | 자동 테스트 |
| INPUT-12 | 우클릭 메뉴로 상태를 바로 고르거나 이름을 바꾸거나 지운다 | 메뉴: 할 일 / 하는 중 / 끝낸 일 / 이름 바꾸기 / 삭제. 현재 상태에 체크 표시. macOS는 Control+클릭도 같음 | 자동 테스트 |
| INPUT-13 | 이름 바꾸기는 메뉴나 제목 더블클릭으로 시작한다 | 제목이 입력칸으로 바뀌고 글자 전체가 선택된다 | 자동 테스트 |
| INPUT-14 | Enter나 다른 곳 클릭으로 이름을 저장한다 | 둘이 겹쳐도 한 번만 저장한다. IME 조합 중인 마지막 글자도 포함한다 | 자동 테스트 |
| INPUT-15 | Esc를 누르면 이름 바꾸기를 취소한다 | 원래 제목으로 돌아간다 | 자동 테스트 |
| INPUT-16 | 이름 바꾸기 칸에 여러 줄을 붙여 넣으면 한 줄로 합친다 | 줄바꿈은 공백 하나로 바뀌어 커서 위치에 들어간다 | 자동 테스트 |
| INPUT-17 | 삭제는 확인 없이 바로 지운다 | 메뉴에서 고르면 즉시 사라진다 | 자동 테스트 |
| INPUT-18 | 초기화는 위젯 안에서 한 번 확인받는다 | ⋯ → `menu.reset`을 누르면 위젯 위에 확인 판: `reset.question`("할 일 N개를 모두 지울까요?"), `reset.warning`, 버튼 `reset.cancel`/`reset.confirm`. 모두 지우기 → TASK-14. 취소나 판 바깥 클릭 → 아무것도 하지 않는다. 설정은 그대로다 | 자동 테스트 |
| INPUT-19 | 할 일이 없으면 초기화를 고를 수 없다 | 메뉴 항목이 비활성 | 자동 테스트 |

- [ ] **Step 2: 체크리스트에 INPUT-06 추가** (두 체크리스트 `## 입력`)

- [ ] **Step 3: 검사**

Run: `pnpm spec:check`
Expected: `요구사항 57개 (자동 테스트 49, 직접 확인 8)`, `통과`

- [ ] **Step 4: 커밋**

```bash
git add spec
git commit -m "docs: 입력과 조작 spec 작성"
```

---

### Task 6: `behavior/window.md`와 `behavior/startup.md`

**Files:**
- Create: `spec/behavior/window.md`, `spec/behavior/startup.md`
- Modify: 두 체크리스트 `## 창`, `## 시작과 종료`

**근거:** `WindowSize.cs`, `WindowPlacement.cs`, `CardOpacity.cs`, `AutoStart.cs`, `App.xaml.cs`, `MainWindow.xaml.cs`의 크기 조절·헤더·고정·메뉴·투명도 부분, 대응 테스트 파일, v1.3 설계 3.1·3.2·4.4·5장.

- [ ] **Step 1: `spec/behavior/window.md` 작성**

맨 위: 제목 "창", 변경 이력, "크기와 좌표는 논리 픽셀이고 그림자 여백(가로·세로 각 10)을 포함한 창 기준"이라는 정의.

| ID | 제목 | 결과의 핵심 | 확인 |
|---|---|---|---|
| WND-01 | 창은 테두리 없는 둥근 카드다 | OS 기본 테두리와 제목 표시줄이 없다. 카드 밖은 투명하고 그림자가 있다 | 직접 확인 |
| WND-02 | 헤더를 끌어 창을 옮긴다 | 놓으면 위치를 저장한다 | 자동 테스트 |
| WND-03 | 가장자리와 모서리를 끌어 크기를 바꾼다 | 끄는 동안 카드가 마우스를 따라온다. 놓은 높이가 최대 높이가 되고, 내용이 더 짧으면 내용만큼 줄어든다. 놓으면 폭과 최대 높이를 저장한다 | 직접 확인 |
| WND-04 | 폭은 280~620이다 | 범위 밖 값은 가까운 끝으로 맞춘다 | 자동 테스트 |
| WND-05 | 최대 높이는 300 이상, 작업 영역 높이 이하다 | 작업 영역이 300보다 작아도 300은 허용한다 | 자동 테스트 |
| WND-06 | 저장된 크기가 없거나 비정상이면 기본 크기를 쓴다 | 폭 320, 최대 높이 = 작업 영역 높이의 50%(300 이상). NaN·무한대도 기본값 | 자동 테스트 |
| WND-07 | 저장된 위치가 없으면 기본 위치에 띄운다 | 주 모니터 작업 영역 오른쪽 위, 여백 24. 좌표가 하나만 있어도 기본 위치 | 자동 테스트 |
| WND-08 | 헤더를 잡을 수 있으면 저장된 위치를 쓴다 | 헤더 40만큼이 어느 모니터 영역에든 보이면 유지(왼쪽 모니터 포함). 아니면 기본 위치 | 자동 테스트 |
| WND-09 | 📌로 맨 위 고정을 켜고 끈다 | 기본은 켜짐. 켜짐·꺼짐이 눈으로 구분되고 툴팁은 `pin.on`/`pin.off`. 바꿀 때마다 저장 | 자동 테스트 |
| WND-10 | ⋯ 메뉴에는 자동 실행, 투명도, 초기화, 종료가 있다 | 순서대로 `menu.autoStart`(체크 표시), `menu.transparency` 슬라이더와 % 값, `menu.reset`, `menu.quit`. 메뉴는 ⋯ 버튼 바로 아래에 오른쪽 끝을 맞춰 뜨고, 아래 공간이 모자라면 위로 뜬다 | 자동 테스트 |
| WND-11 | 배경 투명도는 0~40%를 1% 단위로 고른다 | 저장값은 불투명도 1.0~0.6. 범위 밖은 가까운 끝으로, 없거나 비정상이면 0%(불투명) | 자동 테스트 |
| WND-12 | 투명도는 끄는 동안 바로 보이고 메뉴를 닫을 때 한 번 저장한다 | 슬라이더 위 마우스 휠은 한 칸에 2%씩 | 자동 테스트 |
| WND-13 | 투명도는 배경에만 적용된다 | 카드·접힌 섹션 줄·하는 중 배경이 비치고, 글자와 동그라미는 선명하다. 그림자도 함께 옅어진다 | 직접 확인 |
| WND-14 | 창을 닫을 때 위치와 접힘 상태를 저장한다 | 종료 시 저장 | 자동 테스트 |

WND-04~08의 `조건`/`결과`는 v1.4 `WindowSizeTests.cs`, `WindowPlacementTests.cs`의 숫자를 그대로 옮긴다.

- [ ] **Step 2: `spec/behavior/startup.md` 작성**

맨 위: 제목 "시작과 종료", 변경 이력.

| ID | 제목 | 결과의 핵심 | 확인 |
|---|---|---|---|
| START-01 | 위젯은 하나만 뜬다 | 이미 떠 있을 때 다시 실행하면 새 창을 만들지 않고 기존 위젯을 앞으로 가져온 뒤 새 프로세스는 끝난다 | 직접 확인 |
| START-02 | `settings.json`이 없으면 처음 실행이다 | 처음 실행이면 자동 실행을 켜고, `settings.json`을 바로 만든다 | 자동 테스트 |
| START-03 | 처음 실행이 아니면 사용자의 자동 실행 선택을 지킨다 | 켜져 있으면 등록 경로를 지금 실행 파일 경로로 갱신한다. 꺼져 있으면 그대로 둔다 | 자동 테스트 |
| START-04 | ⋯ 메뉴의 자동 실행 체크는 실제 등록 상태를 보여 준다 | 메뉴를 열 때 OS 등록 여부를 읽는다. 누르면 켜고 끄고, 다시 읽어서 표시한다 | 자동 테스트 |
| START-05 | 자동 실행 설정을 바꾸지 못하면 알린다 | 안내 줄에 `notice.autoStartFailed`. 체크 표시는 실제 상태 | 자동 테스트 |
| START-06 | 시작할 때 자동 실행·첫 설정 저장이 실패해도 위젯은 뜬다 | 조용히 넘어간다 | 자동 테스트 |
| START-07 | 개발 빌드는 자동 실행을 건드리지 않는다 | 개발 모드로 실행하면 START-02·03의 자동 실행 단계를 건너뛴다 | 자동 테스트 |
| START-08 | ⋯ → 종료로 끝낸다 | 설정을 저장하고 프로세스가 끝난다 | 자동 테스트 |
| START-09 | 안내 줄은 한 번에 하나만 보여 준다 | 우선순위: 저장 실패(`notice.saveFailed`) > 파일 문제(`notice.backup`, `notice.newerFile`) > 자동 실행 실패 > 업데이트(UPD). 위 안내가 사라지면 다음 것이 보인다 | 자동 테스트 |

- [ ] **Step 3: 체크리스트에 추가**: `## 창`에 WND-01, WND-03, WND-13. `## 시작과 종료`에 START-01.

- [ ] **Step 4: 검사**

Run: `pnpm spec:check`
Expected: `요구사항 80개 (자동 테스트 68, 직접 확인 12)`, `통과`

- [ ] **Step 5: 커밋**

```bash
git add spec
git commit -m "docs: 창과 시작·종료 spec 작성"
```

---

### Task 7: `behavior/storage.md`

**Files:**
- Create: `spec/behavior/storage.md`
- Modify: 두 체크리스트 `## 저장`

**근거:** `TaskStore.cs`, `SettingsStore.cs`, `WidgetSettings.cs`, `AtomicFile.cs`, `TodoSession.cs`, `App.xaml.cs`(잠긴 파일), `AppPaths.cs`(`TODOWIDGET_DATA_DIR`), 대응 테스트, 설계 문서 9장 전체.

- [ ] **Step 1: 작성**

맨 위: 제목 "저장", 변경 이력, 데이터 폴더는 OS마다 다르다는 문장과 링크(WIN-01, MAC-01), `tasks.json` v2 형식 예시(설계 문서 9.2 그대로), `settings.json` 항목 표:

| 항목 | 형식 | 기본값 |
|---|---|---|
| `left`, `top` | 숫자 또는 null | null (WND-07) |
| `width`, `maxHeight` | 숫자 또는 null | null (WND-06) |
| `opacity` | 숫자 또는 null | null = 1.0 (WND-11) |
| `pinned` | 불리언 | true |
| `doneExpanded` | 불리언 | false |
| `todoExpanded` | 불리언 | true |
| `lastUpdateCheck` | ISO 8601 시각 또는 null | null (UPD-01) |

| ID | 제목 | 결과의 핵심 | 확인 |
|---|---|---|---|
| STORE-01 | 바뀔 때마다 바로 저장한다 | 저장 버튼은 없다. 변경 없음이면 저장하지 않는다. 여러 줄 붙여넣기는 한 번만 저장한다 | 자동 테스트 |
| STORE-02 | 저장은 원본을 깨뜨리지 않는다 | 임시 파일에 쓰고 디스크에 flush한 뒤 원본과 바꾼다. 끝나면 임시 파일이 남지 않는다. 폴더가 없으면 만든다 | 자동 테스트 |
| STORE-03 | 저장 파일은 사람이 읽을 수 있다 | 들여쓰기한 JSON, UTF-8(BOM 없음), 한글·한자를 `\uXXXX`로 바꾸지 않는다 | 자동 테스트 |
| STORE-04 | `tasks.json`은 v2 형식으로 저장한다 | `{ "version": 2, "tasks": [...] }`, 항목 필드는 `id`, `title`, `status`, `createdAt`, `completedAt` | 자동 테스트 |
| STORE-05 | 시각은 PC 시간대를 포함한 ISO 8601로 기록한다 | 예 `2026-10-03T15:00:00+02:00`. 초 아래는 버린다. 기록하는 순간의 PC 시간대를 쓴다 | 자동 테스트 |
| STORE-06 | 날짜 판단은 지금 PC의 시간대를 기준으로 한다 | 같은 날인지 따지는 규칙. v2.0에는 이를 쓰는 기능이 없으므로 시각 비교 함수의 테스트로 확인한다 | 자동 테스트 |
| STORE-07 | `tasks.json`이 없으면 빈 목록으로 시작한다 | 안내 없음 | 자동 테스트 |
| STORE-08 | 깨진 `tasks.json`은 백업하고 빈 목록으로 시작한다 | 깨짐: JSON 오류, 빈 항목, `id`·`title` 없음, 알 수 없는 상태값, 시각 형식 오류. 파일을 `tasks.broken-yyyyMMdd-HHmmss.json`으로 이름을 바꾼다(지금 PC 시각). 같은 이름이 있으면 `-2`, `-3`을 붙인다. 안내 줄에 `notice.backup` | 자동 테스트 |
| STORE-09 | 끝낸 일이 아닌 항목의 끝낸 시각은 무시한다 | 끝낸 일인데 끝낸 시각이 없으면 그대로 받아들인다(LIST-05) | 자동 테스트 |
| STORE-10 | 읽을 수 없는 `tasks.json`은 덮어쓰지 않는다 | 다른 프로그램이 잠가 두는 등으로 읽지 못하면 OS 대화 상자로 `error.cannotOpen`과 파일 경로·오류 내용을 보여 주고 종료한다 | 자동 테스트 |
| STORE-11 | 저장에 실패하면 알리고 다음 변경 때 다시 저장한다 | 변경은 화면에 남는다. 안내 줄에 `notice.saveFailed`. 다음 변경 때 전체를 저장하고, 성공하면 안내를 지운다 | 자동 테스트 |
| STORE-12 | v1.4 형식은 한 번 변환한다 | 최상위가 배열이면 v1.4 형식이다. 원본을 `tasks.v1-backup-yyyyMMdd-HHmmss.json`으로 복사하고, 시각을 `+09:00`으로 해석해 v2 형식으로 저장한다. 이미 v2면 아무것도 하지 않는다 | 자동 테스트 |
| STORE-13 | 변환용 백업에 실패하면 변환하지 않는다 | 원본을 그대로 두고 할 일은 보여 주되 저장하지 않는다. 안내 줄에 `notice.saveFailed`. 다음 변경 때 STORE-12를 다시 시도한다 | 자동 테스트 |
| STORE-14 | 더 새 버전이 만든 파일은 건드리지 않는다 | `version`이 2보다 크면 읽지 않고 덮어쓰지도 백업하지도 않는다. 빈 목록을 보여 주고 안내 줄에 `notice.newerFile`. 이 상태에서는 저장하지 않는다 | 자동 테스트 |
| STORE-15 | `settings.json`이 없거나 깨지면 기본값을 쓴다 | 안내 없음. 빠진 항목만 기본값. 모르는 항목(v1.2의 `doingExpanded` 등)은 무시한다 | 자동 테스트 |
| STORE-16 | 설정의 숫자가 비정상이면 null로 저장한다 | NaN·무한대 → null | 자동 테스트 |
| STORE-17 | 설정 저장 실패는 조용히 넘어간다 | 안내 없음 | 자동 테스트 |
| STORE-18 | 개발 중에는 데이터 폴더를 바꿀 수 있다 | 환경 변수 `TODOWIDGET_DATA_DIR`가 있으면 그 폴더를 쓴다 | 자동 테스트 |

STORE-12 아래에 v1.4 파일 예시와 변환 결과 예시를 나란히 둔다(시각 `2026-09-30 14:05:00` → `2026-09-30T14:05:00+09:00`).

v1.4로 되돌리는 방법(설계 문서 9.3)은 요구사항이 아니라 "참고" 절로 둔다.

- [ ] **Step 2: 체크리스트에 추가**

STORE는 모두 자동 테스트다. 대신 `spec/checklists/windows.md`의 `## 출시`에 v1.4 → v2.0 교체 확인은 Task 9의 REL에서 다룬다. 이 Task에서는 체크리스트를 바꾸지 않는다.

- [ ] **Step 3: 검사**

Run: `pnpm spec:check`
Expected: `요구사항 98개 (자동 테스트 86, 직접 확인 12)`, `통과`

- [ ] **Step 4: 커밋**

```bash
git add spec
git commit -m "docs: 저장 spec 작성 — v2 형식, 시간대 기록, v1.4 변환"
```

---

### Task 8: `behavior/i18n.md`와 `behavior/update.md`

**Files:**
- Create: `spec/behavior/i18n.md`, `spec/behavior/update.md`
- Modify: 두 체크리스트 `## 다국어`, `## 업데이트`

**근거:** 설계 문서 7장·8장, `MainWindow.xaml`의 화면 문구, `TodoSession.cs`의 안내 문구, `MainViewModel.cs`의 `RemainingText`·`ClearQuestion`·`DoneToggleText`.

- [ ] **Step 1: `spec/behavior/i18n.md` 작성**

맨 위: 제목 "다국어", 변경 이력.

| ID | 제목 | 결과의 핵심 | 확인 |
|---|---|---|---|
| I18N-01 | 화면 언어는 OS 언어 설정을 따른다 | `ko*` → 한국어, `de*` → 독일어, `zh*`(지역 무관) → 중국어 간체, 그 밖 → 영어. 앱 안에서 바꾸는 메뉴는 없다 | 자동 테스트 |
| I18N-02 | 화면 문구는 모두 언어별 사전에서 꺼낸다 | 아래 문구 표의 키만 쓴다. 코드에 화면 문구를 직접 쓰지 않는다 | 자동 테스트 |
| I18N-03 | 네 언어 사전의 키가 같다 | 하나라도 빠지거나 남으면 실패 | 자동 테스트 |
| I18N-04 | 개수가 들어간 문구는 언어별 복수 규칙을 따른다 | 표의 `one`/`other` 형태. 한국어·중국어는 한 형태 | 자동 테스트 |
| I18N-05 | 저장 데이터는 언어와 무관하다 | 상태는 `todo`/`doing`/`done`으로 저장하고 화면에서만 번역한다. 사용자가 쓴 제목은 번역하지 않는다 | 자동 테스트 |
| I18N-06 | 언어와 OS에 맞는 글꼴을 쓴다 | 설계 문서 6장 글꼴 표. 화면 언어와 다른 언어로 쓴 제목도 깨지지 않는다 | 직접 확인 |
| I18N-07 | 가장 긴 언어에서도 넘치지 않는다 | 독일어, 폭 280에서 헤더·섹션 제목·메뉴·확인 판·안내 줄·입력칸 안내가 잘리거나 겹치지 않는다 | 직접 확인 |

**문구 표** (키, 한국어, 영어. 독일어·중국어 번역은 계획 5에서 사전 파일에 쓰고, 원어민 검토는 가능해지면 반영한다):

| 키 | 한국어 | 영어 |
|---|---|---|
| `app.title` | 할 일 | To-do |
| `header.remaining` | {n}개 남음 | one: {n} task left / other: {n} tasks left |
| `header.allDone` | 모두 끝냈어요 | All done |
| `pin.on` | 맨 위 고정 끄기 | Stop keeping on top |
| `pin.off` | 맨 위에 고정 | Keep on top |
| `menu.more` | 메뉴 | Menu |
| `menu.autoStart` | 컴퓨터 켤 때 자동 실행 | Open at login |
| `menu.transparency` | 투명도 | Transparency |
| `menu.reset` | 초기화 | Clear all |
| `menu.quit` | 종료 | Quit |
| `status.todo` | 할 일 | To do |
| `status.doing` | 하는 중 | In progress |
| `status.done` | 끝낸 일 | Done |
| `item.changeStatus` | 상태 바꾸기 | Change status |
| `item.rename` | 이름 바꾸기 | Rename |
| `item.delete` | 삭제 | Delete |
| `section.doneShow` | 펼치기 | Show |
| `section.doneHide` | 접기 | Hide |
| `input.placeholder` | 할 일 추가 | Add a task |
| `list.empty` | 할 일을 추가해 보세요 | Add your first task |
| `reset.question` | 할 일 {n}개를 모두 지울까요? | one: Delete {n} task? / other: Delete all {n} tasks? |
| `reset.warning` | 지운 뒤에는 되돌릴 수 없어요. | This can't be undone. |
| `reset.cancel` | 취소 | Cancel |
| `reset.confirm` | 모두 지우기 | Delete all |
| `notice.backup` | 저장 파일에 문제가 있어 백업해 두었어요 | Your task file had a problem, so it was backed up |
| `notice.saveFailed` | 저장하지 못했어요. 다음 변경 때 다시 시도해요 | Couldn't save. Will try again on the next change |
| `notice.newerFile` | 새 버전에서 만든 파일이에요. 업데이트해 주세요 | This file is from a newer version. Please update |
| `notice.autoStartFailed` | 자동 실행 설정을 바꾸지 못했어요 | Couldn't change the open-at-login setting |
| `update.available` | 새 버전이 있어요 | A new version is available |
| `update.action` | 업데이트 | Update |
| `update.installing` | 업데이트하는 중이에요 | Updating… |
| `update.failed` | 업데이트하지 못했어요. 나중에 다시 시도해요 | Couldn't update. Will try again later |
| `error.cannotOpen` | 할 일 파일을 열 수 없어요 | Can't open your task file |
| `tray.open` | 열기 | Open |

섹션 제목은 `status.todo`, `status.done`을 다시 쓴다. macOS 메뉴 막대 메뉴의 종료는 `menu.quit`을 쓴다.

- [ ] **Step 2: `spec/behavior/update.md` 작성**

맨 위: 제목 "업데이트", 변경 이력, 원칙 PRIV-01 링크, "v1.4에는 업데이트 기능이 없으므로 v2.0은 직접 설치한다"는 문장.

| ID | 제목 | 결과의 핵심 | 확인 |
|---|---|---|---|
| UPD-01 | 켤 때와 떠 있는 동안 하루 한 번 새 버전을 확인한다 | 켤 때 한 번. 그 뒤 `lastUpdateCheck`로부터 24시간이 지나면 다시. 확인할 때마다 `lastUpdateCheck`를 저장 | 자동 테스트 |
| UPD-02 | 확인은 공개 파일 하나를 읽기만 한다 | GitHub Release의 `latest.json`. 요청에 사용자 데이터를 담지 않는다 | 자동 테스트 |
| UPD-03 | 새 버전이 있으면 안내 줄로 알린다 | `update.available` + 누를 수 있는 `update.action`. START-09 우선순위가 가장 낮다 | 자동 테스트 |
| UPD-04 | 업데이트를 누르면 받아서 설치하고 다시 띄운다 | 진행 중에는 `update.installing`. 끝나면 새 버전이 같은 위치·데이터로 뜬다 | 자동 테스트 |
| UPD-05 | 누르지 않으면 지금 버전을 계속 쓴다 | 안내 줄만 남는다. 강제 설치 없음 | 자동 테스트 |
| UPD-06 | 확인에 실패하면 조용히 넘어간다 | 인터넷 없음, 서버 오류 등. 안내 없음. 다음 주기에 다시 | 자동 테스트 |
| UPD-07 | 받기나 설치에 실패하면 알린다 | `update.failed`를 보여 주고, 다음 확인에서 다시 `update.available` | 자동 테스트 |
| UPD-08 | 서명이 맞지 않는 업데이트는 설치하지 않는다 | UPD-07과 같이 처리 | 자동 테스트 |
| UPD-09 | 실제 업데이트를 두 OS에서 확인한다 | 이전 버전을 설치한 PC에서 새 버전 공개 후 안내 → 클릭 → 재시작 → 할 일·설정 유지 | 직접 확인 |

- [ ] **Step 3: 체크리스트에 추가**: `## 다국어`에 I18N-06, I18N-07. `## 업데이트`에 UPD-09.

- [ ] **Step 4: 검사**

Run: `pnpm spec:check`
Expected: `요구사항 114개 (자동 테스트 99, 직접 확인 15)`, `통과`

- [ ] **Step 5: 커밋**

```bash
git add spec
git commit -m "docs: 다국어와 업데이트 spec 작성"
```

---

### Task 9: `platform/windows.md`, `platform/macos.md`, `release.md`

**Files:**
- Create: `spec/platform/windows.md`, `spec/platform/macos.md`, `spec/release.md`
- Modify: `spec/checklists/windows.md` (`## Windows 전용`, `## 출시`), `spec/checklists/macos.md` (`## macOS 전용`, `## 출시`)

**근거:** 설계 문서 6장·9장(Windows 교체 순간)·10장·12장, `AutoStart.cs`, `AppPaths.cs`, `App.xaml.cs`.

- [ ] **Step 1: `spec/platform/windows.md` 작성**

맨 위: 제목, 변경 이력, "공통 행동은 `behavior/`를 따른다. 이 문서는 Windows에서 어떻게 하는지만 적는다."

| ID | 제목 | 결과의 핵심 | 확인 |
|---|---|---|---|
| WIN-01 | 데이터 폴더는 `%APPDATA%\TodoWidget\`이다 | v1.4와 같다 | 자동 테스트 |
| WIN-02 | 작업 표시줄과 트레이에 나오지 않는다 | 위젯만 보인다 | 직접 확인 |
| WIN-03 | 자동 실행은 레지스트리 Run 키에 등록한다 | `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, 값 이름 `TodoWidget`, 값은 따옴표로 감싼 실행 파일 경로. 관리자 권한이 필요 없다 | 자동 테스트 |
| WIN-04 | v1.4가 등록한 자동 실행을 이어받는다 | 값 이름이 같으므로 START-03에 따라 새 설치 경로로 갱신된다. v1.4에서 껐으면 꺼진 채로 둔다 | 자동 테스트 |
| WIN-05 | 설치 파일은 관리자 권한 없이 사용자 폴더에 설치한다 | 시작 메뉴에 바로가기가 생기고, 설정 → 앱에서 제거할 수 있다. 제거해도 데이터 폴더는 남는다 | 직접 확인 |
| WIN-06 | WebView2가 없으면 설치 파일이 함께 설치한다 | Windows 10에서 WebView2가 없어도 설치 후 실행된다 | 직접 확인 |
| WIN-07 | 다시 실행하면 가려진 위젯이 앞으로 온다 | 시작 메뉴나 바로가기로 다시 실행 → START-01 | 직접 확인 |
| WIN-08 | 글꼴은 맑은 고딕, Segoe UI, Microsoft YaHei다 | 한국어 / 영어·독일어 / 중국어 | 직접 확인 |
| WIN-09 | v1.4 데이터가 있는 PC에 설치하면 할 일이 그대로 보인다 | STORE-12 변환과 백업 파일 생성, WIN-04 자동 실행 인계까지 실제 v1.4 데이터로 확인 | 직접 확인 |

- [ ] **Step 2: `spec/platform/macos.md` 작성**

| ID | 제목 | 결과의 핵심 | 확인 |
|---|---|---|---|
| MAC-01 | 데이터 폴더는 `~/Library/Application Support/TodoWidget/`이다 | | 자동 테스트 |
| MAC-02 | Dock과 Cmd+Tab에 나오지 않는다 | 위젯과 메뉴 막대 아이콘만 보인다 | 직접 확인 |
| MAC-03 | 메뉴 막대 아이콘을 누르면 위젯이 앞으로 온다 | 다른 데스크톱에 있어도 지금 화면으로 온다. 아이콘은 단색이라 밝은·어두운 메뉴 막대 모두에서 보인다 | 직접 확인 |
| MAC-04 | 메뉴 막대 아이콘을 우클릭하면 메뉴가 뜬다 | `tray.open`, `menu.quit` | 직접 확인 |
| MAC-05 | Spotlight나 Launchpad로 다시 실행해도 위젯이 앞으로 온다 | START-01 | 직접 확인 |
| MAC-06 | 위젯은 모든 데스크톱(Spaces)에 따라다닌다 | 데스크톱을 바꿔도 같은 자리에 있다 | 직접 확인 |
| MAC-07 | 📌를 켜면 전체 화면 앱 위에도 뜬다 | 끄면 일반 창처럼 다른 창에 가려질 수 있고, 전체 화면 앱에서는 보이지 않는다 | 직접 확인 |
| MAC-08 | 자동 실행은 로그인 항목으로 등록한다 | 사용자 LaunchAgent. 관리자 권한이 필요 없다 | 자동 테스트 |
| MAC-09 | 글꼴은 Apple SD Gothic Neo, 시스템 기본, PingFang SC다 | 한국어 / 영어·독일어 / 중국어 | 직접 확인 |
| MAC-10 | 투명 창을 위해 `macOSPrivateApi`를 쓴다 | 이 때문에 App Store에는 올릴 수 없다(범위 밖) | 자동 테스트 |
| MAC-11 | dmg에서 응용 프로그램 폴더로 끌어 설치한다 | 처음 실행 때 시스템 설정 → 개인정보 보호 및 보안 → "그래도 열기"로 열린다 | 직접 확인 |
| MAC-12 | 새 macOS에서도 투명 창이 동작한다 | 새 macOS가 나오면 WND-01, WND-13을 다시 확인한다 | 직접 확인 |

MAC-10의 자동 테스트는 "Tauri 설정 파일에 `macOSPrivateApi: true`가 있다"를 검사하는 것으로 한다고 `확인` 아래 한 줄로 적는다.

- [ ] **Step 3: `spec/release.md` 작성**

맨 위: 제목, 변경 이력, 출시 절차 그림(설계 문서 10장).

| ID | 제목 | 결과의 핵심 | 확인 |
|---|---|---|---|
| REL-01 | 코드를 올릴 때마다 두 OS에서 자동 검사한다 | GitHub Actions, Windows·macOS: lint(의존 방향 포함), Vitest, `cargo test`, `pnpm spec:check`, 빌드 | 자동 테스트 |
| REL-02 | 출시 전에는 strict 검사가 통과해야 한다 | `pnpm spec:check:strict` | 자동 테스트 |
| REL-03 | 버전 태그를 올리면 출시 후보가 초안으로 만들어진다 | `v*` 태그 → Windows NSIS(x64), macOS dmg(universal), `latest.json`, 업데이트 서명 파일이 Release 초안에 올라간다 | 자동 테스트 |
| REL-04 | 체크리스트를 마치고 PM이 승인해야 공개한다 | Windows 체크리스트와 macOS의 IME 항목은 PM이 확인한다 | 직접 확인 |
| REL-05 | 버전은 v2.0.0부터 SemVer를 따른다 | 버그 수정은 패치, 기능 추가는 마이너. 앱 버전과 태그가 같다 | 자동 테스트 |
| REL-06 | 업데이트 서명 키는 잃어버리지 않게 보관한다 | 개인 키와 비밀번호는 GitHub Secrets에, 백업 사본은 PM이 비밀번호 관리자에 보관. 공개 키는 앱 설정에 들어간다 | 직접 확인 |
| REL-07 | 릴리스 안내에 설치와 교체 방법을 적는다 | OS별 첫 실행 경고 넘기는 법, "기존 위젯을 먼저 종료하세요", v1.4로 되돌리는 법(STORE 참고 절) | 직접 확인 |
| REL-08 | v2.0 출시 전에 저장소 이름을 `todo-widget`으로 바꾼다 | 실행 직전 PM 확인. 업데이트 주소가 새 이름을 가리킨다 | 직접 확인 |
| REL-09 | macOS 빌드는 ad-hoc 서명을 한다 | 유료 인증서는 쓰지 않는다 | 자동 테스트 |

- [ ] **Step 4: 체크리스트에 추가**

`windows.md`의 `## Windows 전용`: WIN-02, WIN-05, WIN-06, WIN-07, WIN-08, WIN-09. `macos.md`의 `## macOS 전용`: MAC-02~07, MAC-09, MAC-11, MAC-12. 두 체크리스트의 `## 출시`: REL-04, REL-06, REL-07, REL-08.

- [ ] **Step 5: 검사**

Run: `pnpm spec:check`
Expected: `요구사항 144개 (자동 테스트 110, 직접 확인 34)`, `통과`

- [ ] **Step 6: 커밋**

```bash
git add spec
git commit -m "docs: Windows·macOS 플랫폼 spec과 출시 spec 작성"
```

---

### Task 10: v1.4 대조와 PM 리뷰

**Files:**
- Modify: `spec/**` (빠진 것 보완), `CLAUDE.md` (spec 상태), `docs/superpowers/specs/2026-10-03-cross-platform-design.md` (변경 이력)

- [ ] **Step 1: v1.4 테스트 대조**

v1.4 테스트 102개 이름을 뽑는다.

```bash
grep -hE "public void" tests/TodoWidget.Core.Tests/*.cs | sed 's/^ *public void //; s/(.*//' | grep -v -E '^(Dispose|Advance)$'
```

이름마다 대응하는 spec ID를 찾아 표로 정리한다(커밋하지 않는 작업 메모, scratchpad에 둔다). 대응이 없는 테스트는 (a) v2.0에서 일부러 바뀐 동작(KST 관련 3개, 시각 형식 3개)인지, (b) 빠진 요구사항인지 판단한다. (b)는 해당 spec 문서에 요구사항을 추가한다. `AutoStartTests`는 START·WIN에, `KstClockTests`·`KstFormatTests`는 STORE-05·STORE-12에 대응해야 한다.

- [ ] **Step 2: v1.4 화면 동작 대조**

`MainWindow.xaml.cs`의 event handler를 하나씩 보며 대응 ID를 확인한다: `BringToFront`(START-01), `WndProc`(WND-03), `Header_MouseLeftButtonDown`(WND-02), `PinButton_Click`(WND-09), `MoreButton_Click`·`PlaceUnderMoreButton`(WND-10, START-04), `AutoStartMenuItem_Click`(START-04, START-05), `ExitMenuItem_Click`(START-08), `OpacitySlider_*`·`MoreMenu_Closed`·`ApplyOpacity`(WND-11~13), `Reset*`(INPUT-18), `TodoFold_*`·`DoneFold_*`(LIST-07~09), `StatusMark_Click`(INPUT-11), `Menu*_Click`(INPUT-12, INPUT-17), `MenuRename_Click`·`Title_MouseLeftButtonDown`·`EditBox_*`·`CommitRename`(INPUT-13~15), `AddBox_*`(INPUT-01~05), `TextBox_Pasting`(INPUT-07, INPUT-10, INPUT-16), `SaveSettings`(WND-14, STORE-17). 빠진 것이 있으면 추가한다.

- [ ] **Step 3: 검사**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`
Expected: 모두 통과. 요구사항 개수는 Step 1·2에서 추가한 만큼 144보다 많을 수 있다.

- [ ] **Step 4: CLAUDE.md 갱신**

"spec 상태" 절을 다음으로 바꾼다:

```markdown
### spec 상태

`spec/`이 동작의 기준이다(시작점: `spec/README.md`). 설계 문서는 설계 시점의 기록이다. 형식과 연결은 `pnpm spec:check`로, 출시 전에는 `pnpm spec:check:strict`로 검사한다.
```

문서 지도 표의 `spec/` 행을 "지금 동작의 기준 (요구사항 ID, 확인 방법) → `spec/README.md`에서 시작"으로 바꾼다. 계획 행을 추가한다: "구현 계획과 로드맵 → `docs/superpowers/plans/2026-10-03-v2-spec-baseline.md` (전체 로드맵 포함)".

- [ ] **Step 5: 커밋**

```bash
git add spec CLAUDE.md docs
git commit -m "docs: v1.4 대조로 spec 보완, CLAUDE.md에 spec 상태 반영"
```

- [ ] **Step 6: PM 리뷰 요청**

PM에게 다음을 보여 주고 승인을 받는다. 승인 전에는 계획 2를 쓰지 않는다.
- `spec/README.md`부터 읽는 순서
- 요구사항 수(자동 테스트 / 직접 확인)와 체크리스트 분량 (설계 문서 대화에서 "체크리스트 분량은 초안을 보고 같이 정한다"고 했다)
- 이 계획에서 개발이 새로 정한 제품 동작 (2026-10-03 계획 리뷰 때 PM이 모두 승인함. spec에 그대로 반영됐는지만 보여 준다):
  - START-09 안내 줄 우선순위
  - START-05 자동 실행 실패 안내를 대화 상자 대신 안내 줄로
  - UPD-04·UPD-07 업데이트 진행·실패 문구
  - STORE-13 변환 백업 실패 시 동작
  - MAC-04 메뉴 막대 우클릭 메뉴에 "열기" 추가
  - 영어 문구 전체 (I18N 문구 표)
- 00-principles의 PERF 숫자

승인되면 각 spec 문서 변경 이력에 승인받은 날짜로 `- YYYY-MM-DD: PM 승인` 한 줄을 추가하고 커밋한다.

```bash
git add spec
git commit -m "docs: spec 기준선 PM 승인 기록"
```

---

## 실행 기록 (2026-10-03)

계획 1을 subagent 방식으로 실행하면서 개발이 내린 판단이다. 계획 문서와 다르게 간 곳, 계획에 없던 것을 정한 곳을 모두 적는다. 제품 동작에 닿는 것은 `spec/README.md`의 "v1.4와 다른 점" 표에도 있다.

**실행 방식**
- 작업 1~4는 Haiku/Sonnet으로, 작업 5 수정부터는 PM 지시에 따라 구현·수정·리뷰 모두 Opus로 진행했다. 작업 1~4는 리뷰를 통과해 다시 하지 않았다.

**계획 문서를 바로잡은 것**
- LIST-14에 넣으라고 한 "다 들어감" 예시는 LIST-13으로 옮겼다(계획 오류).
- INPUT-11은 "다른 할 일"이 아니라 이름을 바꾸던 입력칸이면 어느 할 일이든 먼저 저장한다(v1.4 동작).
- tasks.md의 "변경 없음" 참조는 STORE-02가 아니라 STORE-01이다.
- 체크리스트 규칙: 출시(REL) 직접 확인 항목은 Windows 체크리스트에만 둔다(PM이 진행). 체크리스트는 "매 출시"와 "v2.0.0 또는 해당 부분이 바뀐 출시만"으로 나눈다. 예상 시간은 매 출시 15~20분, v2.0.0 전체 45~60분이다.

**제품 동작에 닿는 판단 (PM 리뷰 안건)**
- 자동 실행 상태는 OS가 실제로 허용한 상태로 판정한다. macOS는 SMAppService 로그인 항목(macOS 13 이상, 켜져 있으면 실행할 때마다 다시 등록), Windows는 Run 값 + StartupApproved 끈 표시. Windows는 끈 표시가 있어도 Run 값의 경로는 늘 갱신해 v1.4가 다시 뜨는 일을 막는다. 제거하면 Run 값을 지운다.
- 최소 macOS는 13(Ventura)이다.
- START-05 자동 실행 실패 안내는 다음에 바꾸기에 성공하거나 다시 켜면 사라진다.
- 안내 줄은 한 번에 안내 하나이고 두 줄까지 줄바꿈된다. `notice.newerFile`이 떠 있고 새 버전이 있으면 옆에 업데이트 버튼을 보인다. 업데이트 실패 안내("업데이트하지 못했어요") 옆에도 다시 시도 버튼을 둔다.
- 업데이트 확인은 성공했을 때만 `lastUpdateCheck`를 기록하고, 실패하면 1시간 뒤 다시 확인한다. 잠자기에서 깨어나면 24시간이 지났는지 본다. UPD-09 실제 업데이트 확인은 v2.0.1부터, pre-release와 시험용 주소로 한다.
- `settings.json`은 항목별로 기본값을 쓰고(v1.4는 파일 전체), 모르는 항목은 저장할 때 남긴다. 저장 파일 앞의 BOM은 무시한다.
- WND-08 화면 밖 판정은 모니터마다 전체 영역으로 한다. 좌표는 주 모니터 배율 기준 논리 픽셀이다. WND-11 투명도는 .5를 올린다.
- 같은 상태 지정(TASK-09/10)과 같은 제목으로 이름 바꾸기(TASK-11)는 저장하지 않는다.
- OS 언어는 Windows 표시 언어, macOS 선호 언어 첫 번째다.
- INPUT-20: Enter로 추가할 때도 맨 앞 `-`/`•` 하나를 뗀다(v1.4 동작, v1.3 설계에는 없음).

**미뤄 둔 것**
- spec 검사기: 닫히지 않은 코드 울타리, 들여쓴 제목, backtick이 든 info 문자열은 처리하지 않는다(드묾). 나중 검사기 개선 때 다룬다.
- 설계 문서 2장 표와 13장 일부 문구는 설계 당시 기록으로 둔다. 기준은 `spec/`이다.
- UPD-09 시험 빌드의 업데이트 주소 바꾸기 방법은 계획 2에서 정한다.
- I18N-02 하드코딩 문구 검사의 예외 목록(CSS 클래스 등)은 계획 5에서 정한다.
