# v2.0 할 일 규칙과 앱 흐름 구현 계획 (계획 3/6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 화면과 OS 없이 돌아가는 할 일 규칙(domain)과 앱 흐름(application)을 가짜 port로 TDD하며 만든다. 저장 형식, v1.4 데이터 변환, 시작 흐름, 안내 줄 우선순위, 업데이트 확인 일정까지 포함한다.

**Architecture:** `src/domain/`은 순수 TypeScript 값과 규칙(시각, 제목, 할 일 목록, 섹션 높이, 창 크기·위치, 투명도, 언어, 버전)이다. `src/application/`은 port(`FileStore`, `AutoStart`, `Updater`, `Timer`, `AppInfo`)에 기대는 흐름(저장소, 세션, 설정, 시작, 자동 실행 메뉴, 업데이트, 안내 줄)이다. 시계(`Clock`)와 id 생성기(`IdGenerator`)는 domain이 쓰므로 domain에 둔다. 테스트용 가짜는 `src/testing/`에 둔다. 실제 adapter(파일, 레지스트리, updater plugin)는 계획 4, 화면과 ViewModel은 계획 5다.

**Tech Stack:** TypeScript 5.9(지울 수 있는 문법만), Vitest 5, 기존 `tools/architecture/` 구조 테스트

**Spec:** `spec/` (기준), 특히 `spec/behavior/tasks.md`, `list.md`, `input.md`, `window.md`, `startup.md`, `storage.md`, `i18n.md`, `update.md`. 설계 문서 `docs/superpowers/specs/2026-10-03-cross-platform-design.md` 5장(구조). 계획 2에서 넘어온 일은 `docs/superpowers/reports/2026-10-03-plan2-risk-check.md`의 "다음 계획으로 넘기는 일".

## 이 계획이 다루는 spec ID

| 문서 | 이 계획에서 자동 테스트로 연결하는 ID | 나머지 (다른 계획) |
|---|---|---|
| tasks | TASK-01~16 | — |
| list | LIST-02~05, LIST-09, LIST-13~15 | LIST-01, 06~08, 10 (계획 5 ViewModel) |
| input | INPUT-08, INPUT-09 | 나머지 (계획 5) |
| window | WND-04~08, WND-09(저장), WND-11, WND-14(저장) | WND-02·03·10·12 등 (계획 4·5) |
| startup | START-02~07, START-09 | START-08 (계획 4·5) |
| storage | STORE-01, 03~19 | STORE-02 (계획 4 Rust 안전한 쓰기) |
| i18n | I18N-01 | 나머지 (계획 5) |
| update | UPD-01, 03~08 | UPD-02 (계획 4 updater adapter) |

## Global Constraints

- 커밋 메시지는 `feat:`·`test:`·`refactor:`·`chore:`·`ci:`·`docs:` 뒤에 한국어. `Co-Authored-By` 줄은 넣지 않는다. push하지 않는다(PM 확인 뒤에만).
- `corepack enable` 후 pnpm 10.33.2. 새 npm 의존성은 넣지 않는다. `pnpm-lock.yaml` `lockfileVersion: '9.0'`.
- TypeScript는 지울 수 있는 문법만(`enum`·constructor parameter property·`namespace` 금지). import에 `.ts` 확장자를 붙인다. private 상태는 `#` 필드로 둔다.
- 층 규칙(설계 문서 5.1, `tools/architecture/rules.ts`): domain → domain만, application → domain·application, adapters → domain·application·adapters. domain·application은 바깥 패키지를 import하지 않는다(Task 1에서 강제). 제품 코드는 `node:` 모듈을 쓰지 않는다. `src/testing/`은 테스트 전용 가짜이고 제품 코드에서 import하지 않는다.
- 테스트 이름은 spec ID로 시작한다(예: `it('TASK-09 ...')`). 한 요구사항을 여러 층이 나눠 맡으면, 맡은 부분을 확인하는 테스트마다 같은 ID를 붙인다(이 계획은 domain·application 부분, 계획 4·5가 나머지). ID가 붙지 않은 보조 테스트도 괜찮다.
- 시각 예시는 spec과 같은 값을 쓴다. 기본 "지금"은 `2026-10-03T09:00:00+09:00`이다.
- 매 Task 끝에 `pnpm test && pnpm typecheck && pnpm spec:check`가 통과해야 한다. Rust는 이 계획에서 바꾸지 않는다(Task 1의 CI 설정만 예외).
- subagent는 구현·수정·리뷰 모두 Opus를 쓴다(CLAUDE.md).

---

### Task 1: 계획 2에서 넘어온 기반 정리

**Files:**
- Modify: `tools/architecture/rules.ts`, `src/architecture.test.ts`, `.github/workflows/ci.yml`
- Modify: `docs/superpowers/reports/2026-10-03-plan2-risk-check.md` ("다음 계획으로 넘기는 일" 표에서 이 Task가 끝낸 줄에 "완료 (계획 3 Task 1)" 표시)

**Interfaces:**
- Produces: `CORE_PACKAGE_ALLOWLIST: readonly string[]`(처음 빈 목록), 구조 테스트의 새 규칙 두 가지(domain·application의 바깥 패키지 금지, 제품 코드 전체의 `node:` 금지)

- [ ] **Step 1: 실패하는 구조 테스트 추가**

`src/architecture.test.ts`의 `describe('의존 방향', ...)` 안 끝에 다음 두 테스트를 더한다:

```ts
  it('domain과 application은 바깥 패키지를 가져올 수 없다', () => {
    const violations = checkArchitecture([
      file('src/domain/a.ts', "import { writable } from 'svelte/store';"),
      file('src/application/b.ts', "import dayjs from 'dayjs';"),
      file('src/presentation/c.ts', "import { mount } from 'svelte';"),
      file('src/adapters/d.ts', "import { listen } from '@tauri-apps/api/event';"),
    ]);
    expect(violations).toEqual([
      { path: 'src/domain/a.ts', line: 1, message: 'domain 층은 바깥 패키지 svelte/store를 쓸 수 없어요. 허용 목록: 없음' },
      { path: 'src/application/b.ts', line: 1, message: 'application 층은 바깥 패키지 dayjs를 쓸 수 없어요. 허용 목록: 없음' },
    ]);
  });

  it('제품 코드는 어느 층에서도 Node 모듈을 쓸 수 없다', () => {
    const violations = checkArchitecture([
      file('src/presentation/a.ts', "import { readFileSync } from 'node:fs';"),
      file('src/main.ts', "import path from 'node:path';"),
      file('src/adapters/b.ts', "const os = await import('node:os');"),
    ]);
    expect(violations.map((v) => v.message)).toEqual([
      '제품 코드는 Node 모듈(node:fs)을 쓸 수 없어요. 앱은 WebView에서 돌아요',
      '제품 코드는 Node 모듈(node:path)을 쓸 수 없어요. 앱은 WebView에서 돌아요',
      '제품 코드는 Node 모듈(node:os)을 쓸 수 없어요. 앱은 WebView에서 돌아요',
    ]);
  });
```

Run: `pnpm vitest run src/architecture.test.ts`
Expected: FAIL — 두 테스트가 위반을 찾지 못한다.

- [ ] **Step 2: 규칙 구현**

`tools/architecture/rules.ts`에서:

1. `NETWORK_ALLOWED_DIR` 아래에 상수를 더한다:

```ts
/** domain·application이 import해도 되는 바깥 패키지. 늘리려면 PM과 설계 문서 5.1을 함께 고친다. */
export const CORE_PACKAGE_ALLOWLIST: readonly string[] = [];

const CORE_LAYERS: readonly Layer[] = ['domain', 'application'];
```

2. `importViolations`의 루프에서 `@tauri-apps/` 검사 블록 바로 뒤, `if (!specifier.startsWith('.'))` 앞에 다음을 넣는다:

```ts
    if (specifier.startsWith('node:')) {
      violations.push({ path: file.path, line, message: `제품 코드는 Node 모듈(${specifier})을 쓸 수 없어요. 앱은 WebView에서 돌아요` });
      continue;
    }
    if (!specifier.startsWith('.') && CORE_LAYERS.includes(from) && !CORE_PACKAGE_ALLOWLIST.includes(specifier)) {
      const allowed = CORE_PACKAGE_ALLOWLIST.length === 0 ? '없음' : CORE_PACKAGE_ALLOWLIST.join(', ');
      violations.push({ path: file.path, line, message: `${from} 층은 바깥 패키지 ${specifier}를 쓸 수 없어요. 허용 목록: ${allowed}` });
      continue;
    }
```

(`@tauri-apps/` 검사가 먼저 오므로 domain에서 Tauri를 import하면 기존 메시지 하나만 나온다.)

- [ ] **Step 3: 통과 확인**

Run: `pnpm vitest run src/architecture.test.ts`
Expected: PASS. 실제 소스 검사 테스트도 통과한다(`src/main.ts`의 `svelte`, `@tauri-apps`는 root라 허용).

- [ ] **Step 4: CI 보강 (계획 2 이월)**

`.github/workflows/ci.yml`:
1. 각 action의 최신 major 버전을 확인한다:

```bash
for repo in actions/checkout actions/setup-node pnpm/action-setup actions/upload-artifact Swatinem/rust-cache; do
  printf '%s ' "$repo"; gh api "repos/$repo/releases/latest" --jq .tag_name
done
```

   각 action을 그 최신 major 태그(예: `v5`)로 바꾼다. 바꾼 action의 `action.yml`이 Node 24로 도는지 `gh api repos/<repo>/contents/action.yml --jq .content | base64 -d | grep using`으로 확인하고 보고서에 적는다. 최신이 Node 20이면 그 action은 바꾸지 않고 이유를 적는다.
2. `check`와 `windows-probe` job에 `env: { RUSTFLAGS: '-D warnings' }`를 더한다(job 수준. step 수준에 두면 cargo가 다시 빌드한다).

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo ok`
Expected: `ok`

- [ ] **Step 5: 보고서 표 표시, 검사, 커밋**

보고서 "다음 계획으로 넘기는 일" 표에서 이 Task가 끝낸 줄(바깥 패키지 허용 목록, `node:` 금지, Actions 버전, `RUSTFLAGS`)의 계획 칸 끝에 " — 완료 (계획 3 Task 1)"을 붙인다. 제품 코드용 tsconfig 줄은 Task 2에서 표시한다.

Run: `pnpm test && pnpm typecheck && pnpm spec:check`

```bash
git add -A
git commit -m "chore: domain·application의 바깥 패키지와 Node 모듈 사용을 막고 CI action 버전과 Rust 경고 처리를 올림"
```

---

### Task 2: 시각(Timestamp)과 시계

**Files:**
- Create: `tsconfig.core.json`, `src/domain/timestamp.ts`, `src/domain/clock.ts`, `src/adapters/system/clock.ts`, `src/testing/fake-clock.ts`
- Test: `src/domain/timestamp.test.ts`, `src/adapters/system/clock.test.ts`
- Modify: `package.json` (typecheck), 보고서 표(제품 코드 tsconfig 줄 완료 표시)

**Interfaces:**
- Produces:
  - `class Timestamp` — `static fromEpochMs(epochMs: number, offsetMinutes: number): Timestamp`, `static parse(text: string): Timestamp | null`(STORE-05 형식), `static parseV1(text: string): Timestamp | null`(`yyyy-MM-dd HH:mm:ss`, +09:00), `get offsetMinutes(): number`, `toEpochMs(): number`, `compare(other: Timestamp): number`(실제 시각), `format(): string`, `compactStamp(): string`(`yyyyMMdd-HHmmss`, 기록한 시간대), `dateIn(offsetMinutes: number): string`(`yyyy-MM-dd`)
  - `isSameDay(a: Timestamp, b: Timestamp, offsetMinutes: number): boolean`
  - `interface Clock { now(): Timestamp }`
  - `createSystemClock(newDate?: () => { getTime(): number; getTimezoneOffset(): number }): Clock`
  - 테스트용 `class FakeClock implements Clock` — `constructor(iso?: string)`(기본 `2026-10-03T09:00:00+09:00`), `now()`, `set(iso: string)`, `advance(ms: number)`, `setEpochMs(ms: number)`
  - 테스트용 `ts(iso: string): Timestamp`(파싱 실패면 던짐)

- [ ] **Step 1: 실패하는 테스트**

`src/domain/timestamp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ts } from '../testing/fake-clock.ts';
import { Timestamp, isSameDay } from './timestamp.ts';

describe('Timestamp', () => {
  it('STORE-05 PC 시간대를 포함한 ISO 8601로 쓰고 초 아래는 버린다', () => {
    const t = Timestamp.fromEpochMs(Date.UTC(2026, 9, 3, 13, 0, 0, 734), 120);
    expect(t.format()).toBe('2026-10-03T15:00:00+02:00');
  });

  it('STORE-05 UTC는 +00:00으로, 음수와 30분 단위 시간대도 그대로 쓴다', () => {
    const instant = Date.UTC(2026, 9, 3, 13, 0, 0);
    expect(Timestamp.fromEpochMs(instant, 0).format()).toBe('2026-10-03T13:00:00+00:00');
    expect(Timestamp.fromEpochMs(instant, -330).format()).toBe('2026-10-03T07:30:00-05:30');
    expect(Timestamp.fromEpochMs(instant, 345).format()).toBe('2026-10-03T18:45:00+05:45');
  });

  it('STORE-05 쓴 시각을 다시 읽으면 같은 시점과 같은 시간대다', () => {
    const original = Timestamp.fromEpochMs(Date.UTC(2026, 9, 3, 13, 0, 0), -330);
    const read = Timestamp.parse(original.format());
    expect(read?.format()).toBe(original.format());
    expect(read?.offsetMinutes).toBe(-330);
    expect(read?.compare(original)).toBe(0);
  });

  it('형식이 다르거나 없는 날짜·시각은 읽지 않는다', () => {
    for (const text of [
      '',
      '2026-10-03 15:00:00',
      '2026-10-03T15:00:00',
      '2026-10-03T15:00:00Z',
      '2026-10-03T15:00:00.000+09:00',
      '2026-02-30T00:00:00+09:00',
      '2026-10-03T24:00:00+09:00',
      '2026-10-03T15:00:00+15:00',
      '2026-10-03T15:00:00+09:60',
    ])
      expect(Timestamp.parse(text), text).toBeNull();
  });

  it('STORE-12 v1.4 시각은 한국 표준시로 읽는다', () => {
    expect(Timestamp.parseV1('2026-09-30 14:05:00')?.format()).toBe('2026-09-30T14:05:00+09:00');
    expect(Timestamp.parseV1('2026-09-30T14:05:00+09:00')).toBeNull();
    expect(Timestamp.parseV1('2026-02-30 00:00:00')).toBeNull();
  });

  it('LIST-04 시간대가 달라도 실제 시각으로 비교한다', () => {
    const earlier = ts('2026-10-03T08:00:00+09:00'); // 10-02 23:00 UTC
    const later = ts('2026-10-03T00:30:00+00:00'); // 10-03 00:30 UTC
    expect(earlier.format() > later.format()).toBe(true); // 문자열로는 거꾸로다
    expect(earlier.compare(later)).toBeLessThan(0);
    expect(later.compare(earlier)).toBeGreaterThan(0);
  });

  it('STORE-06 같은 날인지는 지금 PC 시간대로 바꿔 비교한다', () => {
    const a = ts('2026-10-04T01:00:00+09:00');
    const b = ts('2026-10-03T09:00:00+02:00');
    expect(isSameDay(a, b, 120)).toBe(true);
    expect(isSameDay(a, b, 540)).toBe(false);
    expect(a.dateIn(120)).toBe('2026-10-03');
  });

  it('백업 파일 이름용 시각은 기록한 시간대의 yyyyMMdd-HHmmss다', () => {
    expect(ts('2026-10-03T09:00:00+09:00').compactStamp()).toBe('20261003-090000');
    expect(ts('2026-01-05T23:04:09-05:00').compactStamp()).toBe('20260105-230409');
  });
});
```

`src/adapters/system/clock.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createSystemClock } from './clock.ts';

describe('시스템 시계', () => {
  it('STORE-05 PC 시간대 오프셋을 함께 기록한다 (getTimezoneOffset은 부호가 반대다)', () => {
    const clock = createSystemClock(() => ({ getTime: () => Date.UTC(2026, 9, 3, 13, 0, 0, 734), getTimezoneOffset: () => -120 }));
    expect(clock.now().format()).toBe('2026-10-03T15:00:00+02:00');
  });

  it('STORE-05 UTC PC는 +00:00이다', () => {
    const clock = createSystemClock(() => ({ getTime: () => Date.UTC(2026, 9, 3, 13, 0, 0), getTimezoneOffset: () => 0 }));
    expect(clock.now().format()).toBe('2026-10-03T13:00:00+00:00');
  });
});
```

Run: `pnpm vitest run src/domain/timestamp.test.ts src/adapters/system/clock.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 2: 구현**

`src/domain/timestamp.ts`:

```ts
const ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-])(\d{2}):(\d{2})$/;
const V1 = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
const KST_OFFSET_MINUTES = 9 * 60;
const MAX_OFFSET_MINUTES = 14 * 60;

/** 한 시점과, 그 시점을 기록할 때의 시간대 오프셋(분). 초 아래는 버린다 (STORE-05). */
export class Timestamp {
  readonly #epochSeconds: number;
  readonly #offsetMinutes: number;

  private constructor(epochSeconds: number, offsetMinutes: number) {
    this.#epochSeconds = epochSeconds;
    this.#offsetMinutes = offsetMinutes;
  }

  static fromEpochMs(epochMs: number, offsetMinutes: number): Timestamp {
    return new Timestamp(Math.floor(epochMs / 1000), offsetMinutes);
  }

  /** `2026-10-03T15:00:00+02:00` 형식만 읽는다. 아니면 null (STORE-05). */
  static parse(text: string): Timestamp | null {
    const match = ISO.exec(text);
    if (!match)
      return null;
    const offsetMinutesPart = Number(match[9]);
    const offset = (match[7] === '-' ? -1 : 1) * (Number(match[8]) * 60 + offsetMinutesPart);
    if (offsetMinutesPart >= 60 || Math.abs(offset) > MAX_OFFSET_MINUTES)
      return null;
    const local = localSeconds(match);
    return local === null ? null : new Timestamp(local - offset * 60, offset);
  }

  /** v1.4의 `2026-09-30 14:05:00`을 한국 표준시로 읽는다 (STORE-12). */
  static parseV1(text: string): Timestamp | null {
    const match = V1.exec(text);
    if (!match)
      return null;
    const local = localSeconds(match);
    return local === null ? null : new Timestamp(local - KST_OFFSET_MINUTES * 60, KST_OFFSET_MINUTES);
  }

  get offsetMinutes(): number {
    return this.#offsetMinutes;
  }

  toEpochMs(): number {
    return this.#epochSeconds * 1000;
  }

  /** 실제 시각으로 비교한다. 시간대가 달라도 순서가 맞다 (LIST-04). */
  compare(other: Timestamp): number {
    return this.#epochSeconds - other.#epochSeconds;
  }

  format(): string {
    const { date, time } = fields(this.#epochSeconds, this.#offsetMinutes);
    const sign = this.#offsetMinutes < 0 ? '-' : '+';
    const abs = Math.abs(this.#offsetMinutes);
    return `${date}T${time}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  }

  /** 백업 파일 이름용 `yyyyMMdd-HHmmss`. 기록한 시간대의 시각이다 (STORE-08, STORE-12). */
  compactStamp(): string {
    const { date, time } = fields(this.#epochSeconds, this.#offsetMinutes);
    return `${date.replaceAll('-', '')}-${time.replaceAll(':', '')}`;
  }

  /** 주어진 시간대에서의 날짜 `yyyy-MM-dd` (STORE-06). */
  dateIn(offsetMinutes: number): string {
    return fields(this.#epochSeconds, offsetMinutes).date;
  }
}

/** 두 시각을 지금 PC 시간대로 바꿔 같은 날인지 본다 (STORE-06). */
export function isSameDay(a: Timestamp, b: Timestamp, offsetMinutes: number): boolean {
  return a.dateIn(offsetMinutes) === b.dateIn(offsetMinutes);
}

/** 정규식의 1~6번 그룹(연월일시분초)을 그 자리 시각의 초로 바꾼다. 없는 날짜·시각이면 null. */
function localSeconds(match: RegExpExecArray): number | null {
  const [year, month, day, hour, minute, second] = [1, 2, 3, 4, 5, 6].map((i) => Number(match[i]));
  const ms = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(ms);
  const same =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day &&
    check.getUTCHours() === hour &&
    check.getUTCMinutes() === minute &&
    check.getUTCSeconds() === second;
  return same ? ms / 1000 : null;
}

function fields(epochSeconds: number, offsetMinutes: number): { date: string; time: string } {
  const d = new Date((epochSeconds + offsetMinutes * 60) * 1000);
  return {
    date: `${String(d.getUTCFullYear()).padStart(4, '0')}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
```

`src/domain/clock.ts`:

```ts
import type { Timestamp } from './timestamp.ts';

/** 지금 시각. 실제는 PC 시계(`src/adapters/system/clock.ts`), 테스트는 고정 시계를 넣는다. */
export interface Clock {
  now(): Timestamp;
}
```

`src/adapters/system/clock.ts`:

```ts
import type { Clock } from '../../domain/clock.ts';
import { Timestamp } from '../../domain/timestamp.ts';

interface DateLike {
  getTime(): number;
  getTimezoneOffset(): number;
}

/** PC 시계와 그 순간의 PC 시간대 (STORE-05). getTimezoneOffset은 UTC − 지역 시각(분)이라 부호를 뒤집는다. */
export function createSystemClock(newDate: () => DateLike = () => new Date()): Clock {
  return {
    now(): Timestamp {
      const date = newDate();
      return Timestamp.fromEpochMs(date.getTime(), -date.getTimezoneOffset());
    },
  };
}
```

`src/testing/fake-clock.ts`:

```ts
import type { Clock } from '../domain/clock.ts';
import { Timestamp } from '../domain/timestamp.ts';

/** 테스트용: 파싱에 실패하면 던진다. */
export function ts(iso: string): Timestamp {
  const parsed = Timestamp.parse(iso);
  if (!parsed)
    throw new Error(`시각 형식이 아니에요: ${iso}`);
  return parsed;
}

/** 테스트용 고정 시계. 기본 "지금"은 2026-10-03T09:00:00+09:00. */
export class FakeClock implements Clock {
  #now: Timestamp;

  constructor(iso = '2026-10-03T09:00:00+09:00') {
    this.#now = ts(iso);
  }

  now(): Timestamp {
    return this.#now;
  }

  set(iso: string): void {
    this.#now = ts(iso);
  }

  setEpochMs(ms: number): void {
    this.#now = Timestamp.fromEpochMs(ms, this.#now.offsetMinutes);
  }

  advance(ms: number): void {
    this.setEpochMs(this.#now.toEpochMs() + ms);
  }
}
```

- [ ] **Step 3: 제품 코드용 tsconfig**

`tsconfig.core.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": []
  },
  "include": ["src/domain/**/*.ts", "src/application/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

`package.json`의 `typecheck`를 다음으로 바꾼다:

```json
"typecheck": "tsc --noEmit -p tsconfig.tools.json && tsc --noEmit -p tsconfig.core.json && svelte-check --tsconfig ./tsconfig.json --fail-on-warnings"
```

(domain·application은 DOM도 Node 타입도 없는 ES2022로 검사한다. `Date`는 ES2022에 있다.)

- [ ] **Step 4: 통과 확인과 커밋**

Run: `pnpm vitest run src/domain/timestamp.test.ts src/adapters/system/clock.test.ts`
Expected: PASS

Run: `pnpm test && pnpm typecheck && pnpm spec:check`

보고서 표의 제품 코드 tsconfig 줄에 " — 완료 (계획 3 Task 2)"를 붙인다.

```bash
git add -A
git commit -m "feat: 시간대를 담는 Timestamp와 시계, 제품 코드용 tsconfig 추가"
```

---

### Task 3: 제목 정리와 붙여넣기 줄 나누기

**Files:**
- Create: `src/domain/title.ts`, `src/domain/paste.ts`
- Test: `src/domain/title.test.ts`, `src/domain/paste.test.ts`

**Interfaces:**
- Produces:
  - `class Title` — `static parse(raw: string): Title | null`, `get text(): string`
  - `hasLineBreak(text: string): boolean`, `splitLines(text: string): string[]`, `stripBullet(line: string): string`

- [ ] **Step 1: 실패하는 테스트**

`src/domain/title.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Title } from './title.ts';

describe('Title', () => {
  it('TASK-03 줄바꿈·탭·연속 공백을 공백 하나로 합치고 앞뒤 공백을 지운다', () => {
    expect(Title.parse('  보고서\n  쓰기\t ')?.text).toBe('보고서 쓰기');
  });

  it('TASK-03 전각 공백(U+3000)과 NEL(U+0085)도 공백이다', () => {
    expect(Title.parse('　보고서\u0085　쓰기　')?.text).toBe('보고서 쓰기');
  });

  it('TASK-03 U+FEFF는 공백이 아니다', () => {
    expect(Title.parse(' ﻿보고서 ')?.text).toBe('﻿보고서');
  });

  it('TASK-04 정리하고 나서 빈 제목이면 만들지 않는다', () => {
    for (const raw of ['', '   ', '\n\t', '　\u0085'])
      expect(Title.parse(raw), JSON.stringify(raw)).toBeNull();
  });
});
```

`src/domain/paste.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { hasLineBreak, splitLines, stripBullet } from './paste.ts';

describe('붙여넣기 줄', () => {
  it('줄바꿈은 \\r\\n, \\r, \\n 모두 나눈다', () => {
    expect(splitLines('a\r\nb\rc\nd')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('줄바꿈이 하나라도 있으면 여러 줄이다 (끝에 줄바꿈 하나만 있어도)', () => {
    expect(hasLineBreak('abc\n')).toBe(true);
    expect(hasLineBreak('a\rb')).toBe(true);
    expect(hasLineBreak('abc')).toBe(false);
  });

  it('줄 앞 공백을 지운 뒤 맨 앞의 - 또는 • 하나만 뗀다', () => {
    expect(stripBullet('  - 은행 방문')).toBe(' 은행 방문');
    expect(stripBullet('• 택배 반품')).toBe(' 택배 반품');
    expect(stripBullet('--두 개')).toBe('-두 개');
    expect(stripBullet('　-전각 공백 뒤')).toBe('전각 공백 뒤');
  });

  it('숫자로 된 목록 기호는 남긴다', () => {
    expect(stripBullet('1. 분기 보고서')).toBe('1. 분기 보고서');
  });
});
```

Run: `pnpm vitest run src/domain/title.test.ts src/domain/paste.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 2: 구현**

`src/domain/title.ts`:

```ts
// Unicode White_Space 전부(U+3000, U+0085 포함, U+FEFF 제외). String.prototype.trim은 U+FEFF도 지우므로 쓰지 않는다.
const WHITE_SPACE_RUN = /\p{White_Space}+/gu;
const EDGE_SPACE = /^ | $/g;

/** 정리된 할 일 제목. 빈 제목은 만들어지지 않는다 (TASK-03, TASK-04). */
export class Title {
  readonly #text: string;

  private constructor(text: string) {
    this.#text = text;
  }

  static parse(raw: string): Title | null {
    const text = raw.replace(WHITE_SPACE_RUN, ' ').replace(EDGE_SPACE, '');
    return text.length === 0 ? null : new Title(text);
  }

  get text(): string {
    return this.#text;
  }
}
```

`src/domain/paste.ts`:

```ts
const LEADING_WHITE_SPACE = /^\p{White_Space}+/u;
const LINE_BREAK = /\r\n|\r|\n/;
const HAS_LINE_BREAK = /[\r\n]/;

/** 줄바꿈이 하나라도 있으면 여러 줄 붙여넣기다 (INPUT-07). */
export function hasLineBreak(text: string): boolean {
  return HAS_LINE_BREAK.test(text);
}

export function splitLines(text: string): string[] {
  return text.split(LINE_BREAK);
}

/** 줄 앞 공백을 지운 뒤 맨 앞의 `-` 또는 `•` 하나만 뗀다. `1.` 같은 숫자는 남긴다 (INPUT-09, INPUT-20). */
export function stripBullet(line: string): string {
  const trimmed = line.replace(LEADING_WHITE_SPACE, '');
  return trimmed.startsWith('-') || trimmed.startsWith('•') ? trimmed.slice(1) : trimmed;
}
```

- [ ] **Step 3: 통과 확인과 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`

```bash
git add -A
git commit -m "feat: 할 일 제목 정리와 붙여넣기 줄 나누기 규칙 추가"
```

---

### Task 4: 할 일 목록 규칙 (TodoList)

**Files:**
- Create: `src/domain/todo-status.ts`, `src/domain/todo-item.ts`, `src/domain/ids.ts`, `src/domain/todo-list.ts`, `src/adapters/system/ids.ts`, `src/testing/sequence-ids.ts`
- Test: `src/domain/todo-list.test.ts`, `src/adapters/system/ids.test.ts`

**Interfaces:**
- Consumes: `Timestamp`, `Clock`, `FakeClock`, `ts` (Task 2), `Title`, `splitLines`, `stripBullet` (Task 3)
- Produces:
  - `type TodoStatus = 'todo' | 'doing' | 'done'`, `nextStatus(s: TodoStatus): TodoStatus`, `isTodoStatus(v: unknown): v is TodoStatus`
  - `interface TodoItem { readonly id: string; readonly title: string; readonly status: TodoStatus; readonly createdAt: Timestamp; readonly completedAt: Timestamp | null }`
  - `type IdGenerator = () => string`
  - `class TodoList` — `constructor(clock: Clock, newId: IdGenerator, items?: readonly TodoItem[])`, `get items(): readonly TodoItem[]`(추가된 순서), `get remainingCount(): number`, `add(rawTitle: string): boolean`, `addLines(text: string): number`, `cycle(id: string): boolean`, `setStatus(id: string, status: TodoStatus): boolean`, `rename(id: string, rawTitle: string): boolean`, `remove(id: string): boolean`, `clear(): boolean`. 바꾸는 method는 "변경 없음"이면 `false`를 돌려준다.
  - `createIdGenerator(): IdGenerator` (adapter), 테스트용 `sequenceIds(prefix?: string): IdGenerator`

- [ ] **Step 1: 실패하는 테스트**

`src/domain/todo-list.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeClock } from '../testing/fake-clock.ts';
import { sequenceIds } from '../testing/sequence-ids.ts';
import { TodoList } from './todo-list.ts';

let clock: FakeClock;
let list: TodoList;

beforeEach(() => {
  clock = new FakeClock('2026-10-03T09:00:00+09:00');
  list = new TodoList(clock, sequenceIds());
});

function only() {
  const [item] = list.items;
  if (!item)
    throw new Error('할 일이 없어요');
  return item;
}

describe('추가', () => {
  it('TASK-01 새 할 일은 할 일 상태로 만들어진다', () => {
    expect(list.add('보고서 초안 쓰기')).toBe(true);
    const item = only();
    expect(item.title).toBe('보고서 초안 쓰기');
    expect(item.status).toBe('todo');
    expect(item.createdAt.format()).toBe('2026-10-03T09:00:00+09:00');
    expect(item.completedAt).toBeNull();
  });

  it('TASK-02 추가할 때마다 id 생성기에서 서로 다른 id를 받는다', () => {
    list.add('a');
    list.add('b');
    list.add('c');
    expect(list.items.map((i) => i.id)).toEqual(['id-1', 'id-2', 'id-3']);
  });

  it('TASK-03 제목의 공백을 정리한다', () => {
    list.add('  보고서\n  쓰기\t ');
    expect(only().title).toBe('보고서 쓰기');
  });

  it('TASK-04 정리하고 나서 빈 제목이면 추가하지 않는다', () => {
    for (const raw of ['', '   ', '\n\t'])
      expect(list.add(raw)).toBe(false);
    expect(list.items).toEqual([]);
  });
});

describe('상태', () => {
  it('TASK-05 할 일 → 하는 중 → 끝낸 일 → 할 일로 돈다', () => {
    list.add('a');
    const id = only().id;
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      expect(list.cycle(id)).toBe(true);
      seen.push(only().status);
    }
    expect(seen).toEqual(['doing', 'done', 'todo']);
  });

  it('TASK-06 끝낸 일이 되면 지금 시각을 끝낸 시각으로 기록한다 (순환과 지정 모두)', () => {
    list.add('a');
    list.add('b');
    const [a, b] = list.items.map((i) => i.id);
    list.setStatus(a!, 'doing');
    list.setStatus(b!, 'doing');
    clock.set('2026-10-03T09:30:00+09:00');
    list.cycle(a!);
    list.setStatus(b!, 'done');
    expect(list.items.map((i) => i.completedAt?.format())).toEqual(['2026-10-03T09:30:00+09:00', '2026-10-03T09:30:00+09:00']);
  });

  it('TASK-07 끝낸 일에서 벗어나면 끝낸 시각을 지운다', () => {
    list.add('a');
    const id = only().id;
    list.setStatus(id, 'done');
    list.setStatus(id, 'doing');
    expect(only().completedAt).toBeNull();
    list.setStatus(id, 'done');
    list.cycle(id);
    expect(only().status).toBe('todo');
    expect(only().completedAt).toBeNull();
  });

  it('TASK-08 다시 끝내면 그때의 새 시각을 기록한다', () => {
    list.add('a');
    const id = only().id;
    list.setStatus(id, 'done');
    list.setStatus(id, 'todo');
    clock.advance(60 * 60 * 1000);
    list.setStatus(id, 'done');
    expect(only().completedAt?.format()).toBe('2026-10-03T10:00:00+09:00');
  });

  it('TASK-09 이미 끝낸 일을 다시 끝낸 일로 지정하면 아무것도 바뀌지 않는다', () => {
    list.add('a');
    const id = only().id;
    list.setStatus(id, 'done');
    clock.advance(60 * 60 * 1000);
    expect(list.setStatus(id, 'done')).toBe(false);
    expect(only().completedAt?.format()).toBe('2026-10-03T09:00:00+09:00');
  });

  it('TASK-10 상태를 한 번에 지정하고, 같은 상태로 지정하면 변경 없음이다', () => {
    list.add('a');
    const id = only().id;
    expect(list.setStatus(id, 'done')).toBe(true);
    expect(only().status).toBe('done');
    expect(list.setStatus(id, 'doing')).toBe(true);
    expect(only().status).toBe('doing');
    expect(list.setStatus(id, 'doing')).toBe(false);
  });
});

describe('이름 바꾸기, 삭제, 모두 지우기', () => {
  it('TASK-11 이름도 같은 규칙으로 정리하고, 정리한 제목이 같으면 변경 없음이다', () => {
    list.add('초안');
    const id = only().id;
    expect(list.rename(id, '  보고서\n초안  ')).toBe(true);
    expect(only().title).toBe('보고서 초안');
    expect(list.rename(id, '  보고서 초안 ')).toBe(false);
  });

  it('TASK-12 빈 제목으로는 이름을 바꿀 수 없다', () => {
    list.add('초안');
    expect(list.rename(only().id, '   ')).toBe(false);
    expect(only().title).toBe('초안');
  });

  it('TASK-13 삭제하면 그 할 일만 사라진다', () => {
    list.add('a');
    list.add('b');
    const [a] = list.items.map((i) => i.id);
    expect(list.remove(a!)).toBe(true);
    expect(list.items.map((i) => i.title)).toEqual(['b']);
  });

  it('TASK-14 모두 지우면 상태와 관계없이 전부 사라지고, 비어 있으면 변경 없음이다', () => {
    list.add('a');
    list.add('b');
    list.add('c');
    const [a, b] = list.items.map((i) => i.id);
    list.setStatus(a!, 'doing');
    list.setStatus(b!, 'done');
    expect(list.clear()).toBe(true);
    expect(list.items).toEqual([]);
    expect(list.clear()).toBe(false);
  });

  it('TASK-15 없는 id로 조작하면 아무것도 바뀌지 않는다', () => {
    list.add('a');
    const before = list.items;
    expect(list.cycle('없음')).toBe(false);
    expect(list.setStatus('없음', 'done')).toBe(false);
    expect(list.rename('없음', '새 이름')).toBe(false);
    expect(list.remove('없음')).toBe(false);
    expect(list.items).toBe(before);
  });

  it('TASK-16 남은 개수는 할 일과 하는 중의 합이다', () => {
    for (const t of ['a', 'b', 'c', 'd'])
      list.add(t);
    const [a, b] = list.items.map((i) => i.id);
    list.setStatus(a!, 'doing');
    list.setStatus(b!, 'done');
    expect(list.remainingCount).toBe(3);
  });
});

describe('여러 줄 추가', () => {
  it('INPUT-08 빈 줄과 공백 줄은 건너뛰고 나머지를 붙여 넣은 순서로 추가한다', () => {
    expect(list.addLines('은행\n\n   \n택배')).toBe(2);
    expect(list.items.map((i) => i.title)).toEqual(['은행', '택배']);
  });

  it('INPUT-09 줄 앞의 - 또는 • 하나를 떼고, 숫자 기호는 남기고, 기호만 있는 줄은 건너뛴다', () => {
    expect(list.addLines('  - 은행 방문\r\n• 택배 반품\n1. 분기 보고서\n-\n--두 개')).toBe(4);
    expect(list.items.map((i) => i.title)).toEqual(['은행 방문', '택배 반품', '1. 분기 보고서', '-두 개']);
  });

  it('한 줄도 같은 규칙으로 추가한다', () => {
    expect(list.addLines('- 은행 방문')).toBe(1);
    expect(list.addLines('-')).toBe(0);
    expect(list.items.map((i) => i.title)).toEqual(['은행 방문']);
  });
});
```

`src/adapters/system/ids.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createIdGenerator } from './ids.ts';

describe('시스템 id 생성기', () => {
  it('TASK-02 GUID 문자열이고 겹치지 않는다', () => {
    const next = createIdGenerator();
    const ids = Array.from({ length: 200 }, () => next());
    expect(new Set(ids).size).toBe(200);
    for (const id of ids)
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
```

Run: `pnpm vitest run src/domain/todo-list.test.ts src/adapters/system/ids.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 2: 구현**

`src/domain/todo-status.ts`:

```ts
export type TodoStatus = 'todo' | 'doing' | 'done';

/** 상태 순환: 할 일 → 하는 중 → 끝낸 일 → 할 일 (TASK-05). */
export function nextStatus(status: TodoStatus): TodoStatus {
  if (status === 'todo')
    return 'doing';
  return status === 'doing' ? 'done' : 'todo';
}

export function isTodoStatus(value: unknown): value is TodoStatus {
  return value === 'todo' || value === 'doing' || value === 'done';
}
```

`src/domain/todo-item.ts`:

```ts
import type { Timestamp } from './timestamp.ts';
import type { TodoStatus } from './todo-status.ts';

/** 할 일 하나. 바뀔 때마다 새 객체로 바꾼다(불변). 끝낸 시각은 끝낸 일에만 있다. */
export interface TodoItem {
  readonly id: string;
  readonly title: string;
  readonly status: TodoStatus;
  readonly createdAt: Timestamp;
  readonly completedAt: Timestamp | null;
}
```

`src/domain/ids.ts`:

```ts
/** 겹치지 않는 할 일 id를 만든다. 실제는 GUID(`src/adapters/system/ids.ts`), 테스트는 순서 번호. */
export type IdGenerator = () => string;
```

`src/domain/todo-list.ts`:

```ts
import type { Clock } from './clock.ts';
import type { IdGenerator } from './ids.ts';
import { splitLines, stripBullet } from './paste.ts';
import { Title } from './title.ts';
import type { TodoItem } from './todo-item.ts';
import { type TodoStatus, nextStatus } from './todo-status.ts';

/**
 * 할 일 목록의 규칙. 바꾸는 method는 "변경 없음"이면 false를 돌려준다(tasks.md "변경 없음").
 * 내부 배열은 바뀔 때마다 새로 만들어 바깥에 준 배열이 바뀌지 않게 한다.
 */
export class TodoList {
  #items: readonly TodoItem[];
  readonly #clock: Clock;
  readonly #newId: IdGenerator;

  constructor(clock: Clock, newId: IdGenerator, items: readonly TodoItem[] = []) {
    this.#clock = clock;
    this.#newId = newId;
    this.#items = [...items];
  }

  /** 목록에 추가된 순서. 저장하는 순서이기도 하다 (STORE-04, LIST-03). */
  get items(): readonly TodoItem[] {
    return this.#items;
  }

  /** 할 일과 하는 중의 합 (TASK-16). */
  get remainingCount(): number {
    return this.#items.filter((item) => item.status !== 'done').length;
  }

  add(rawTitle: string): boolean {
    const title = Title.parse(rawTitle);
    if (!title)
      return false;
    const item: TodoItem = { id: this.#newId(), title: title.text, status: 'todo', createdAt: this.#clock.now(), completedAt: null };
    this.#items = [...this.#items, item];
    return true;
  }

  /** 입력칸의 한 줄이나 붙여 넣은 여러 줄을 줄마다 추가한다. 추가한 개수를 돌려준다 (INPUT-08, INPUT-09, INPUT-20). */
  addLines(text: string): number {
    let added = 0;
    for (const line of splitLines(text)) {
      if (this.add(stripBullet(line)))
        added++;
    }
    return added;
  }

  cycle(id: string): boolean {
    const item = this.#find(id);
    return item ? this.#apply(item, nextStatus(item.status)) : false;
  }

  setStatus(id: string, status: TodoStatus): boolean {
    const item = this.#find(id);
    return item ? this.#apply(item, status) : false;
  }

  rename(id: string, rawTitle: string): boolean {
    const item = this.#find(id);
    const title = Title.parse(rawTitle);
    if (!item || !title || title.text === item.title)
      return false;
    this.#replace(item, { ...item, title: title.text });
    return true;
  }

  remove(id: string): boolean {
    const before = this.#items.length;
    this.#items = this.#items.filter((item) => item.id !== id);
    return this.#items.length !== before;
  }

  clear(): boolean {
    if (this.#items.length === 0)
      return false;
    this.#items = [];
    return true;
  }

  /** 같은 상태면 변경 없음. 끝낸 일이 되면 지금 시각을, 벗어나면 끝낸 시각을 지운다 (TASK-06~10). */
  #apply(item: TodoItem, status: TodoStatus): boolean {
    if (item.status === status)
      return false;
    this.#replace(item, { ...item, status, completedAt: status === 'done' ? this.#clock.now() : null });
    return true;
  }

  #replace(previous: TodoItem, next: TodoItem): void {
    this.#items = this.#items.map((item) => (item === previous ? next : item));
  }

  #find(id: string): TodoItem | undefined {
    return this.#items.find((item) => item.id === id);
  }
}
```

`src/adapters/system/ids.ts`:

```ts
import type { IdGenerator } from '../../domain/ids.ts';

/** 겹치지 않는 GUID 문자열 (TASK-02). WebView와 Node 모두 Web Crypto를 가진다. */
export function createIdGenerator(): IdGenerator {
  return () => globalThis.crypto.randomUUID();
}
```

`src/testing/sequence-ids.ts`:

```ts
import type { IdGenerator } from '../domain/ids.ts';

/** 테스트용: `id-1`, `id-2`, ... 순서대로 만든다. */
export function sequenceIds(prefix = 'id'): IdGenerator {
  let n = 0;
  return () => `${prefix}-${++n}`;
}
```

- [ ] **Step 3: 통과 확인과 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`
Expected: 통과. spec:check 안내 목록에서 TASK-01~16, INPUT-08, INPUT-09가 빠진다.

```bash
git add -A
git commit -m "feat: 할 일 목록 규칙(추가·상태·이름·삭제·모두 지우기·남은 개수) 추가"
```

---

### Task 5: 할 일 섹션의 순서

**Files:**
- Modify: `src/domain/todo-list.ts`
- Test: `src/domain/todo-list-sections.test.ts`

**Interfaces:**
- Consumes: `TodoList`, `TodoItem`, `Timestamp` (Task 2, 4)
- Produces: `TodoList.todoSection(): TodoItem[]`(하는 중 먼저, 각각 만든 시각 오래된 순), `TodoList.doneSection(): TodoItem[]`(끝낸 시각 최신 순, 없는 것은 맨 아래)

- [ ] **Step 1: 실패하는 테스트**

`src/domain/todo-list-sections.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FakeClock, ts } from '../testing/fake-clock.ts';
import { sequenceIds } from '../testing/sequence-ids.ts';
import type { TodoItem } from './todo-item.ts';
import { TodoList } from './todo-list.ts';
import type { TodoStatus } from './todo-status.ts';

function item(id: string, status: TodoStatus, createdAt: string, completedAt: string | null = null): TodoItem {
  return { id, title: id, status, createdAt: ts(createdAt), completedAt: completedAt ? ts(completedAt) : null };
}

function listOf(...items: TodoItem[]): TodoList {
  return new TodoList(new FakeClock(), sequenceIds(), items);
}

describe('할 일 섹션', () => {
  it('LIST-02 하는 중이 위, 할 일이 아래이고 각각 만든 시각이 오래된 것이 위다', () => {
    const list = listOf(
      item('a', 'todo', '2026-10-03T09:00:00+09:00'),
      item('b', 'doing', '2026-10-03T10:00:00+09:00'),
      item('c', 'todo', '2026-10-03T08:00:00+09:00'),
      item('d', 'doing', '2026-10-03T07:00:00+09:00'),
      item('e', 'done', '2026-10-03T06:00:00+09:00', '2026-10-03T06:30:00+09:00'),
    );
    expect(list.todoSection().map((i) => i.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('LIST-02 만든 시각도 시간대와 관계없이 실제 시각으로 비교한다', () => {
    const list = listOf(item('later', 'todo', '2026-10-03T00:30:00+00:00'), item('earlier', 'todo', '2026-10-03T08:00:00+09:00'));
    expect(list.todoSection().map((i) => i.id)).toEqual(['earlier', 'later']);
  });

  it('LIST-03 같은 초에 만든 할 일은 추가한 순서를 지킨다', () => {
    const list = listOf(
      item('x', 'todo', '2026-10-03T09:00:00+09:00'),
      item('y', 'todo', '2026-10-03T09:00:00+09:00'),
      item('z', 'todo', '2026-10-03T09:00:00+09:00'),
    );
    expect(list.todoSection().map((i) => i.id)).toEqual(['x', 'y', 'z']);

    const added = new TodoList(new FakeClock(), sequenceIds());
    added.addLines('첫째\n둘째\n셋째');
    expect(added.todoSection().map((i) => i.title)).toEqual(['첫째', '둘째', '셋째']);
  });
});

describe('끝낸 일 섹션', () => {
  it('LIST-04 최근에 끝낸 것이 위이고, 시간대가 달라도 실제 시각으로 비교한다', () => {
    const list = listOf(
      item('earlier', 'done', '2026-10-02T09:00:00+09:00', '2026-10-03T08:00:00+09:00'),
      item('later', 'done', '2026-10-02T09:00:00+09:00', '2026-10-03T00:30:00+00:00'),
      item('todo', 'todo', '2026-10-02T09:00:00+09:00'),
    );
    expect(list.doneSection().map((i) => i.id)).toEqual(['later', 'earlier']);
  });

  it('LIST-05 끝낸 시각이 없는 끝낸 일은 맨 아래다', () => {
    const list = listOf(
      item('none', 'done', '2026-10-02T09:00:00+09:00'),
      item('old', 'done', '2026-10-02T09:00:00+09:00', '2026-10-02T10:00:00+09:00'),
      item('new', 'done', '2026-10-02T09:00:00+09:00', '2026-10-03T10:00:00+09:00'),
    );
    expect(list.doneSection().map((i) => i.id)).toEqual(['new', 'old', 'none']);
  });
});
```

Run: `pnpm vitest run src/domain/todo-list-sections.test.ts`
Expected: FAIL (`todoSection is not a function`)

- [ ] **Step 2: 구현**

`src/domain/todo-list.ts`의 `clear()` 아래에 더한다(정렬은 안정 정렬이라 같은 값이면 추가된 순서를 지킨다):

```ts
  /** 할 일 섹션: 하는 중이 위, 할 일이 아래. 각각 만든 시각이 오래된 것이 위 (LIST-02, LIST-03). */
  todoSection(): TodoItem[] {
    const byCreated = (status: TodoStatus): TodoItem[] =>
      this.#items.filter((item) => item.status === status).sort((a, b) => a.createdAt.compare(b.createdAt));
    return [...byCreated('doing'), ...byCreated('todo')];
  }

  /** 끝낸 일 섹션: 최근에 끝낸 것이 위, 끝낸 시각이 없는 것은 맨 아래 (LIST-04, LIST-05). */
  doneSection(): TodoItem[] {
    return this.#items
      .filter((item) => item.status === 'done')
      .sort((a, b) => {
        if (!a.completedAt || !b.completedAt)
          return (a.completedAt ? 0 : 1) - (b.completedAt ? 0 : 1);
        return b.completedAt.compare(a.completedAt);
      });
  }
```

- [ ] **Step 3: 통과 확인과 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`

```bash
git add -A
git commit -m "feat: 할 일·끝낸 일 섹션의 순서 규칙 추가"
```

---

### Task 6: 섹션 높이 배분

**Files:**
- Create: `src/domain/section-layout.ts`
- Test: `src/domain/section-layout.test.ts`

**Interfaces:**
- Produces: `allocateSectionHeights(available: number, desired: readonly number[], minimum: readonly number[]): number[]` — `available`이 `Infinity`면 제한 없음, `minimum[i]`가 `Infinity`면 그 섹션은 줄지 않는다. v1.4 `SectionLayout.Allocate`와 같은 결과.

- [ ] **Step 1: 실패하는 테스트**

`src/domain/section-layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { allocateSectionHeights } from './section-layout.ts';

function expectClose(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, i) => expect(Math.abs(value - (expected[i] ?? NaN))).toBeLessThanOrEqual(0.01));
}

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

describe('섹션 높이 배분', () => {
  it('LIST-13 높이가 넉넉하면 섹션마다 필요한 만큼 쓴다', () => {
    expect(allocateSectionHeights(400, [100, 200], [70, 74])).toEqual([100, 200]);
    expect(allocateSectionHeights(Infinity, [100, 900], [70, 74])).toEqual([100, 900]);
  });

  it('LIST-14 짧은 섹션은 다 보이고 긴 섹션이 나머지를 쓴다', () => {
    const heights = allocateSectionHeights(400, [100, 900], [70, 74]);
    expectClose(heights, [100, 300]);
    expect(Math.abs(sum(heights) - 400)).toBeLessThanOrEqual(0.01);
  });

  it('LIST-14 긴 섹션 둘은 나머지를 똑같이 나눈다', () => {
    const heights = allocateSectionHeights(400, [600, 900], [70, 74]);
    expectClose(heights, [200, 200]);
    expect(Math.abs(sum(heights) - 400)).toBeLessThanOrEqual(0.01);
  });

  it('LIST-15 최소 높이의 합이 가용 높이 이상이면 최소 높이를 준다', () => {
    expect(allocateSectionHeights(100, [300, 300], [70, 74])).toEqual([70, 74]);
    expect(allocateSectionHeights(144, [300, 300], [70, 74])).toEqual([70, 74]);
  });

  it('LIST-15 접힌 섹션은 제목 줄 높이만 쓰고 나머지를 펼친 섹션이 쓴다', () => {
    expectClose(allocateSectionHeights(200, [30, 900], [30, 74]), [30, 170]);
  });

  it('최소 높이가 없는(무한대) 섹션은 줄지 않는다', () => {
    expect(allocateSectionHeights(400, [100, 900], [Infinity, Infinity])).toEqual([100, 900]);
  });
});
```

Run: `pnpm vitest run src/domain/section-layout.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 2: 구현**

`src/domain/section-layout.ts`:

```ts
/**
 * 끝낸 일·할 일 섹션에 높이를 나눈다. 다 들어가면 각자 필요한 만큼,
 * 넘치면 짧은 섹션은 다 보여 주고 남은 높이를 긴 섹션들이 똑같이 나눈다(각자 스크롤). v1.4 SectionLayout.Allocate와 같다.
 * @param available 섹션들이 쓸 수 있는 전체 높이. Infinity면 제한 없음.
 * @param desired 각 섹션이 다 보이려면 필요한 높이.
 * @param minimum 각 섹션이 줄어들 수 있는 최소 높이(제목 줄 + 첫 항목, 접히면 제목 줄). Infinity면 줄지 않는다.
 */
export function allocateSectionHeights(available: number, desired: readonly number[], minimum: readonly number[]): number[] {
  if (available === Infinity || sum(desired) <= available)
    return [...desired];

  const floors = desired.map((d, i) => Math.min(d, minimum[i] ?? Infinity));
  if (sum(floors) >= available)
    return floors;

  // 모든 섹션이 같은 "수위"까지 차오른다고 보고, 합이 available이 되는 수위를 이분 탐색으로 찾는다.
  let low = 0;
  let high = Math.max(...desired);
  for (let i = 0; i < 100; i++) {
    const level = (low + high) / 2;
    if (fill(level, floors, desired) > available)
      high = level;
    else
      low = level;
  }
  return desired.map((d, i) => clamp(low, floors[i] ?? 0, d));
}

function fill(level: number, floors: readonly number[], desired: readonly number[]): number {
  return sum(desired.map((d, i) => clamp(level, floors[i] ?? 0, d)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
```

- [ ] **Step 3: 통과 확인과 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`

```bash
git add -A
git commit -m "feat: 섹션 높이 배분 규칙 추가"
```

---

### Task 7: 창 크기·위치와 배경 투명도

**Files:**
- Create: `src/domain/window-geometry.ts`, `src/domain/opacity.ts`
- Test: `src/domain/window-geometry.test.ts`, `src/domain/opacity.test.ts`

**Interfaces:**
- Produces:
  - `WINDOW_LIMITS = { minWidth: 280, maxWidth: 620, defaultWidth: 320, minMaxHeight: 300, defaultMaxHeightRatio: 0.5 }`, `PLACEMENT_MARGIN = 24`, `HEADER_GRAB = 40`
  - `interface Rect { left: number; top: number; width: number; height: number }`
  - `interface WidgetSize { width: number; maxHeight: number }`
  - `resolveWidgetSize(savedWidth: number | null, savedMaxHeight: number | null, workAreaHeight: number): WidgetSize`
  - `resolveWidgetPosition(saved: { left: number | null; top: number | null }, windowWidth: number, monitors: readonly Rect[], primaryWorkArea: Rect): { left: number; top: number }`
  - `resolveOpacity(saved: number | null): number`, `transparencyPercent(opacity: number | null): number`, `opacityFromPercent(percent: number): number`, `stepTransparency(percent: number, wheelUp: boolean): number`, `MAX_TRANSPARENCY_PERCENT = 40`
  - 모든 크기·좌표는 주 모니터 배율 기준 논리 픽셀이고 그림자 여백을 포함한 창 기준이다(window.md 용어). 모니터 영역을 이 좌표로 바꾸는 일은 adapter(계획 4)가 한다.

- [ ] **Step 1: 실패하는 테스트**

`src/domain/window-geometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { type Rect, resolveWidgetPosition, resolveWidgetSize } from './window-geometry.ts';

const screen: Rect = { left: 0, top: 0, width: 1920, height: 1080 };
const workArea: Rect = { left: 0, top: 0, width: 1920, height: 1040 };
const leftScreen: Rect = { left: -1920, top: 0, width: 1920, height: 1080 };
const position = (left: number | null, top: number | null, monitors: Rect[] = [screen]) =>
  resolveWidgetPosition({ left, top }, 320, monitors, workArea);

describe('창 크기', () => {
  it('WND-04 폭은 280~620으로 맞춘다', () => {
    expect(resolveWidgetSize(100, 700, 1040).width).toBe(280);
    expect(resolveWidgetSize(2000, 700, 1040).width).toBe(620);
    expect(resolveWidgetSize(450, 700, 1040).width).toBe(450);
  });

  it('WND-05 최대 높이는 300 이상, 작업 영역 높이 이하다', () => {
    expect(resolveWidgetSize(320, 50, 1040).maxHeight).toBe(300);
    expect(resolveWidgetSize(320, 3000, 1040).maxHeight).toBe(1040);
    expect(resolveWidgetSize(320, 700, 1040).maxHeight).toBe(700);
    expect(resolveWidgetSize(320, null, 150).maxHeight).toBe(300);
    expect(resolveWidgetSize(320, 3000, 150).maxHeight).toBe(300);
  });

  it('WND-06 저장된 크기가 없거나 비정상이면 폭 320, 최대 높이는 작업 영역의 절반이다', () => {
    expect(resolveWidgetSize(null, null, 1040)).toEqual({ width: 320, maxHeight: 520 });
    expect(resolveWidgetSize(NaN, Infinity, 1040)).toEqual({ width: 320, maxHeight: 520 });
    expect(resolveWidgetSize(450, null, 1040)).toEqual({ width: 450, maxHeight: 520 });
  });
});

describe('창 위치', () => {
  it('WND-07 저장된 위치가 없거나 좌표가 하나뿐이면 작업 영역 오른쪽 위(여백 24)다', () => {
    expect(position(null, null)).toEqual({ left: 1576, top: 24 });
    expect(position(300, null)).toEqual({ left: 1576, top: 24 });
    expect(position(NaN, 100)).toEqual({ left: 1576, top: 24 });
  });

  it('WND-08 헤더를 잡을 수 있으면 저장된 위치를 쓴다', () => {
    expect(position(300, 200)).toEqual({ left: 300, top: 200 });
    expect(position(1800, 100)).toEqual({ left: 1800, top: 100 });
    expect(position(300, 1010)).toEqual({ left: 300, top: 1010 });
    expect(position(-1500, 100, [screen, leftScreen])).toEqual({ left: -1500, top: 100 });
  });

  it('WND-08 헤더를 잡을 수 없으면 기본 위치를 쓴다', () => {
    for (const [left, top] of [[2500, 100], [-2000, 100], [300, -500], [300, 1070]] as const)
      expect(position(left, top), `${left},${top}`).toEqual({ left: 1576, top: 24 });
  });
});
```

`src/domain/opacity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { opacityFromPercent, resolveOpacity, stepTransparency, transparencyPercent } from './opacity.ts';

describe('배경 투명도', () => {
  it('WND-11 저장값(불투명도)은 0.6~1.0으로 맞추고, 없거나 비정상이면 1.0이다', () => {
    expect(resolveOpacity(0.1)).toBe(0.6);
    expect(resolveOpacity(1.5)).toBe(1);
    expect(resolveOpacity(0.85)).toBe(0.85);
    for (const bad of [null, NaN, Infinity, -Infinity])
      expect(resolveOpacity(bad)).toBe(1);
  });

  it('WND-11 불투명도를 투명도 %로 보여 준다', () => {
    expect(transparencyPercent(0.85)).toBe(15);
    expect(transparencyPercent(0.6)).toBe(40);
    expect(transparencyPercent(null)).toBe(0);
  });

  it('WND-11 고른 %는 가장 가까운 1% 단위로 맞추고 .5는 올리며 0~40%로 제한한다', () => {
    expect(opacityFromPercent(14.6)).toBe(0.85);
    expect(opacityFromPercent(14.5)).toBe(0.85);
    expect(opacityFromPercent(14.4)).toBe(0.86);
    expect(opacityFromPercent(70)).toBe(0.6);
    expect(opacityFromPercent(-5)).toBe(1);
  });

  it('휠 한 칸은 2%씩, 0~40% 안에서 바꾼다', () => {
    expect(stepTransparency(10, true)).toBe(12);
    expect(stepTransparency(10, false)).toBe(8);
    expect(stepTransparency(39, true)).toBe(40);
    expect(stepTransparency(1, false)).toBe(0);
  });
});
```

Run: `pnpm vitest run src/domain/window-geometry.test.ts src/domain/opacity.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 2: 구현**

`src/domain/window-geometry.ts`:

```ts
export const WINDOW_LIMITS = { minWidth: 280, maxWidth: 620, defaultWidth: 320, minMaxHeight: 300, defaultMaxHeightRatio: 0.5 } as const;

/** 저장된 위치가 없을 때 작업 영역 오른쪽 위에서 띄우는 여백 (WND-07). */
export const PLACEMENT_MARGIN = 24;

/** 헤더를 잡아 끌 수 있으려면 이만큼은 모니터 안에 있어야 한다 (WND-08). */
export const HEADER_GRAB = 40;

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WidgetSize {
  width: number;
  maxHeight: number;
}

/** 저장된 폭·최대 높이를 허용 범위로 맞춘다. 높이는 상한일 뿐이다 (WND-04~06). */
export function resolveWidgetSize(savedWidth: number | null, savedMaxHeight: number | null, workAreaHeight: number): WidgetSize {
  const width = isFiniteNumber(savedWidth)
    ? clamp(savedWidth, WINDOW_LIMITS.minWidth, WINDOW_LIMITS.maxWidth)
    : WINDOW_LIMITS.defaultWidth;
  const ceiling = Math.max(WINDOW_LIMITS.minMaxHeight, workAreaHeight);
  const maxHeight = isFiniteNumber(savedMaxHeight)
    ? clamp(savedMaxHeight, WINDOW_LIMITS.minMaxHeight, ceiling)
    : Math.max(WINDOW_LIMITS.minMaxHeight, workAreaHeight * WINDOW_LIMITS.defaultMaxHeightRatio);
  return { width, maxHeight };
}

/** 헤더를 어느 모니터에서든 잡을 수 있으면 저장된 위치, 아니면 주 모니터 작업 영역 오른쪽 위 (WND-07, WND-08). */
export function resolveWidgetPosition(
  saved: { left: number | null; top: number | null },
  windowWidth: number,
  monitors: readonly Rect[],
  primaryWorkArea: Rect,
): { left: number; top: number } {
  const { left, top } = saved;
  if (isFiniteNumber(left) && isFiniteNumber(top) && monitors.some((m) => headerReachable(left, top, windowWidth, m)))
    return { left, top };
  return {
    left: primaryWorkArea.left + primaryWorkArea.width - windowWidth - PLACEMENT_MARGIN,
    top: primaryWorkArea.top + PLACEMENT_MARGIN,
  };
}

function headerReachable(left: number, top: number, width: number, monitor: Rect): boolean {
  const overlap = Math.min(left + width, monitor.left + monitor.width) - Math.max(left, monitor.left);
  return overlap >= HEADER_GRAB && top >= monitor.top && top + HEADER_GRAB <= monitor.top + monitor.height;
}

function isFiniteNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
```

`src/domain/opacity.ts`:

```ts
const MIN_OPACITY = 0.6;
const MAX_OPACITY = 1;

/** ⋯ 메뉴 슬라이더의 오른쪽 끝 (WND-11). */
export const MAX_TRANSPARENCY_PERCENT = 40;

const WHEEL_STEP_PERCENT = 2;

/** 저장값(카드 배경 불투명도)을 0.6~1.0으로 맞춘다. 없거나 비정상이면 1.0 (WND-11). */
export function resolveOpacity(saved: number | null): number {
  return saved !== null && Number.isFinite(saved) ? clamp(saved, MIN_OPACITY, MAX_OPACITY) : MAX_OPACITY;
}

/** 슬라이더와 % 값은 "얼마나 비치는가"를 보여 준다. 불투명도 0.85 → 15 (WND-11). */
export function transparencyPercent(opacity: number | null): number {
  return roundHalfUp((1 - resolveOpacity(opacity)) * 100);
}

/** 고른 %를 1% 단위(.5는 올림)로 맞추고 0~40%로 제한해 불투명도로 바꾼다 (WND-11). */
export function opacityFromPercent(percent: number): number {
  const p = clamp(roundHalfUp(percent), 0, MAX_TRANSPARENCY_PERCENT);
  return (100 - p) / 100;
}

/** 슬라이더 위 휠 한 칸: 위로 굴리면 2% 더 투명하게 (WND-12). */
export function stepTransparency(percent: number, wheelUp: boolean): number {
  return clamp(percent + (wheelUp ? WHEEL_STEP_PERCENT : -WHEEL_STEP_PERCENT), 0, MAX_TRANSPARENCY_PERCENT);
}

function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
```

- [ ] **Step 3: 통과 확인과 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`

```bash
git add -A
git commit -m "feat: 창 크기·위치와 배경 투명도 규칙 추가"
```

---

### Task 8: 화면 언어와 버전 비교

**Files:**
- Create: `src/domain/language.ts`, `src/domain/version.ts`
- Test: `src/domain/language.test.ts`, `src/domain/version.test.ts`

**Interfaces:**
- Produces: `type Language = 'ko' | 'en' | 'de' | 'zh-Hans'`, `pickLanguage(osLocale: string | null): Language`, `isNewerVersion(candidate: string, current: string): boolean`

- [ ] **Step 1: 실패하는 테스트**

`src/domain/language.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pickLanguage } from './language.ts';

describe('화면 언어', () => {
  it('I18N-01 OS 언어의 앞부분으로 고르고, zh는 지역과 관계없이 간체, 그 밖은 영어다', () => {
    const cases: [string, string][] = [
      ['ko-KR', 'ko'],
      ['de-AT', 'de'],
      ['zh-CN', 'zh-Hans'],
      ['zh-TW', 'zh-Hans'],
      ['zh-Hant-HK', 'zh-Hans'],
      ['en-US', 'en'],
      ['fr-FR', 'en'],
      ['ja-JP', 'en'],
    ];
    for (const [locale, language] of cases)
      expect(pickLanguage(locale), locale).toBe(language);
  });

  it('I18N-01 대소문자, 밑줄 구분자, 빈 값도 다룬다', () => {
    expect(pickLanguage('KO')).toBe('ko');
    expect(pickLanguage('de_DE')).toBe('de');
    expect(pickLanguage('')).toBe('en');
    expect(pickLanguage(null)).toBe('en');
  });
});
```

`src/domain/version.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isNewerVersion } from './version.ts';

describe('새 버전', () => {
  it('지금보다 높은 버전만 새 버전이다', () => {
    expect(isNewerVersion('2.1.0', '2.0.0')).toBe(true);
    expect(isNewerVersion('2.0.1', '2.0.0')).toBe(true);
    expect(isNewerVersion('3.0.0', '2.9.9')).toBe(true);
    expect(isNewerVersion('2.0.0', '2.0.0')).toBe(false);
    expect(isNewerVersion('1.9.0', '2.0.0')).toBe(false);
  });

  it('자리마다 숫자로 비교한다 (2.0.10 > 2.0.9)', () => {
    expect(isNewerVersion('2.0.10', '2.0.9')).toBe(true);
  });

  it('앞의 v는 허용하고, 형식이 다르면 새 버전이 아니다', () => {
    expect(isNewerVersion('v2.1.0', '2.0.0')).toBe(true);
    expect(isNewerVersion('2.1', '2.0.0')).toBe(false);
    expect(isNewerVersion('abc', '2.0.0')).toBe(false);
    expect(isNewerVersion('2.1.0-rc.1', '2.0.0')).toBe(false);
  });
});
```

Run: `pnpm vitest run src/domain/language.test.ts src/domain/version.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 2: 구현**

`src/domain/language.ts`:

```ts
export type Language = 'ko' | 'en' | 'de' | 'zh-Hans';

/** OS 언어 설정의 앞부분으로 화면 언어를 고른다. 켤 때 한 번 정한다 (I18N-01). */
export function pickLanguage(osLocale: string | null): Language {
  const primary = (osLocale ?? '').toLowerCase().split(/[-_]/)[0];
  if (primary === 'ko')
    return 'ko';
  if (primary === 'de')
    return 'de';
  if (primary === 'zh')
    return 'zh-Hans';
  return 'en';
}
```

`src/domain/version.ts`:

```ts
const VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/;

/** `candidate`가 `current`보다 높은 버전인지 (update.md 용어 "새 버전"). 형식이 다르면 새 버전이 아니다. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = parse(candidate);
  const b = parse(current);
  if (!a || !b)
    return false;
  for (let i = 0; i < 3; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y)
      return x > y;
  }
  return false;
}

function parse(version: string): number[] | null {
  const match = VERSION.exec(version.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}
```

- [ ] **Step 3: 통과 확인과 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`

```bash
git add -A
git commit -m "feat: 화면 언어 고르기와 버전 비교 규칙 추가"
```

---

### Task 9: `tasks.json` 읽고 쓰기 형식 (codec)

**Files:**
- Create: `src/application/storage/bom.ts`, `src/application/storage/tasks-codec.ts`
- Test: `src/application/storage/tasks-codec.test.ts`

**Interfaces:**
- Consumes: `Timestamp`, `TodoItem`, `isTodoStatus` (Task 2, 4)
- Produces:
  - `stripBom(text: string): string` (맨 앞 BOM 하나만)
  - `TASKS_FORMAT_VERSION = 2`
  - `type DecodedTasks = { kind: 'v2'; items: TodoItem[] } | { kind: 'v1'; items: TodoItem[] } | { kind: 'broken'; reason: string } | { kind: 'newer'; version: number }`
  - `decodeTasks(text: string): DecodedTasks`, `encodeTasks(items: readonly TodoItem[]): string`

- [ ] **Step 1: 실패하는 테스트**

`src/application/storage/tasks-codec.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { TodoItem } from '../../domain/todo-item.ts';
import { ts } from '../../testing/fake-clock.ts';
import { decodeTasks, encodeTasks } from './tasks-codec.ts';

const report: TodoItem = { id: 'a', title: '보고서 초안 쓰기', status: 'doing', createdAt: ts('2026-09-30T09:12:40+09:00'), completedAt: null };
const bank: TodoItem = {
  id: 'b',
  title: '은행 방문',
  status: 'done',
  createdAt: ts('2026-09-29T08:00:00+09:00'),
  completedAt: ts('2026-09-30T14:05:00+09:00'),
};

const validTask = { id: 'a', title: '보고서', status: 'todo', createdAt: '2026-10-03T09:00:00+09:00', completedAt: null };
const v2 = (task: unknown): string => JSON.stringify({ version: 2, tasks: [task] });

function itemsOf(text: string): TodoItem[] {
  const decoded = decodeTasks(text);
  if (decoded.kind !== 'v2' && decoded.kind !== 'v1')
    throw new Error(`읽지 못했어요: ${JSON.stringify(decoded)}`);
  return decoded.items;
}

describe('쓰기', () => {
  it('STORE-04 { version: 2, tasks } 모양, 항목은 다섯 필드, 추가된 순서다', () => {
    const json = JSON.parse(encodeTasks([report, bank]));
    expect(json).toEqual({
      version: 2,
      tasks: [
        { id: 'a', title: '보고서 초안 쓰기', status: 'doing', createdAt: '2026-09-30T09:12:40+09:00', completedAt: null },
        { id: 'b', title: '은행 방문', status: 'done', createdAt: '2026-09-29T08:00:00+09:00', completedAt: '2026-09-30T14:05:00+09:00' },
      ],
    });
    expect(Object.keys(json.tasks[0])).toEqual(['id', 'title', 'status', 'createdAt', 'completedAt']);
  });

  it('STORE-03 들여쓴 JSON이고, 한글을 \\uXXXX로 바꾸지 않고, BOM이 없다', () => {
    const text = encodeTasks([report]);
    expect(text).toContain('\n  "version": 2');
    expect(text).toContain('보고서 초안 쓰기');
    expect(text).not.toContain('\\u');
    expect(text.startsWith('﻿')).toBe(false);
  });

  it('STORE-05 시각은 기록한 시간대를 포함해 쓴다', () => {
    const utc: TodoItem = { ...report, createdAt: ts('2026-10-03T13:00:00+00:00') };
    expect(JSON.parse(encodeTasks([utc])).tasks[0].createdAt).toBe('2026-10-03T13:00:00+00:00');
  });

  it('쓴 것을 다시 읽으면 같은 할 일이다', () => {
    const read = itemsOf(encodeTasks([report, bank]));
    expect(read.map((i) => [i.id, i.title, i.status, i.createdAt.format(), i.completedAt?.format() ?? null])).toEqual([
      ['a', '보고서 초안 쓰기', 'doing', '2026-09-30T09:12:40+09:00', null],
      ['b', '은행 방문', 'done', '2026-09-29T08:00:00+09:00', '2026-09-30T14:05:00+09:00'],
    ]);
  });
});

describe('읽기', () => {
  it('STORE-08 깨진 파일을 알아본다', () => {
    const broken: [string, string][] = [
      ['JSON 문법 오류', '{'],
      ['빈 파일', ''],
      ['최상위 null', 'null'],
      ['최상위 숫자', '3'],
      ['version 없는 객체', '{"tasks":[]}'],
      ['version 1', '{"version":1,"tasks":[]}'],
      ['version 소수', '{"version":2.5,"tasks":[]}'],
      ['version 문자열', '{"version":"2","tasks":[]}'],
      ['tasks 없음', '{"version":2}'],
      ['tasks가 객체', '{"version":2,"tasks":{}}'],
      ['null 항목', v2(null)],
      ['id 없음', v2({ ...validTask, id: undefined })],
      ['id 숫자', v2({ ...validTask, id: 5 })],
      ['id 공백뿐', v2({ ...validTask, id: '　 ' })],
      ['title 없음', v2({ ...validTask, title: undefined })],
      ['title 빈 문자열', v2({ ...validTask, title: '' })],
      ['알 수 없는 status', v2({ ...validTask, status: 'paused' })],
      ['createdAt 없음', v2({ ...validTask, createdAt: undefined })],
      ['v2 파일에 v1 시각', v2({ ...validTask, createdAt: '2026-10-03 09:00:00' })],
      ['completedAt 형식 오류', v2({ ...validTask, status: 'done', completedAt: '어제' })],
      ['completedAt 숫자', v2({ ...validTask, status: 'done', completedAt: 1 })],
      ['v1 파일에 v2 시각', JSON.stringify([{ ...validTask }])],
    ];
    for (const [name, text] of broken)
      expect(decodeTasks(text).kind, name).toBe('broken');
  });

  it('STORE-09 끝낸 일이 아닌 항목의 끝낸 시각은 무시하고, 끝낸 시각이 없는 끝낸 일은 받아들인다', () => {
    const [todo] = itemsOf(v2({ ...validTask, status: 'todo', completedAt: '2026-10-03T10:00:00+09:00' }));
    expect(todo?.completedAt).toBeNull();
    const [done] = itemsOf(v2({ ...validTask, status: 'done', completedAt: null }));
    expect(done?.status).toBe('done');
    expect(done?.completedAt).toBeNull();
  });

  it('STORE-12 v1.4 배열 형식은 한국 표준시로 읽고, v2로 쓰면 spec의 변환 결과와 같다', () => {
    const v1 = JSON.stringify([
      { id: 'a', title: '보고서 초안 쓰기', status: 'doing', createdAt: '2026-09-30 09:12:40', completedAt: null },
      { id: 'b', title: '은행 방문', status: 'done', createdAt: '2026-09-29 08:00:00', completedAt: '2026-09-30 14:05:00' },
    ]);
    const decoded = decodeTasks(v1);
    expect(decoded.kind).toBe('v1');
    expect(JSON.parse(encodeTasks(itemsOf(v1)))).toEqual(JSON.parse(encodeTasks([report, bank])));
  });

  it('STORE-14 version이 2보다 큰 정수면 더 새 버전 파일이다', () => {
    expect(decodeTasks('{"version":3,"tasks":"무엇이든"}')).toEqual({ kind: 'newer', version: 3 });
  });

  it('STORE-19 맨 앞 BOM 하나는 무시하고, 두 개면 깨진 파일이다', () => {
    expect(decodeTasks(`﻿${v2(validTask)}`).kind).toBe('v2');
    expect(decodeTasks(`﻿﻿${v2(validTask)}`).kind).toBe('broken');
  });

  it('모르는 필드는 읽을 때 무시하고 쓸 때 뺀다', () => {
    const text = JSON.stringify({ version: 2, extra: true, tasks: [{ ...validTask, color: 'red' }] });
    const encoded = JSON.parse(encodeTasks(itemsOf(text)));
    expect(encoded.extra).toBeUndefined();
    expect(encoded.tasks[0].color).toBeUndefined();
  });
});
```

Run: `pnpm vitest run src/application/storage/tasks-codec.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 2: 구현**

`src/application/storage/bom.ts`:

```ts
/** 맨 앞의 UTF-8 BOM 하나만 지운다. 두 번째부터는 내용이다 (STORE-19). */
export function stripBom(text: string): string {
  return text.startsWith('﻿') ? text.slice(1) : text;
}
```

`src/application/storage/tasks-codec.ts`:

```ts
import { Timestamp } from '../../domain/timestamp.ts';
import type { TodoItem } from '../../domain/todo-item.ts';
import { isTodoStatus } from '../../domain/todo-status.ts';
import { stripBom } from './bom.ts';

export const TASKS_FORMAT_VERSION = 2;

export type DecodedTasks =
  | { kind: 'v2'; items: TodoItem[] }
  | { kind: 'v1'; items: TodoItem[] }
  | { kind: 'broken'; reason: string }
  | { kind: 'newer'; version: number };

type ParseTime = (text: string) => Timestamp | null;

const BLANK = /^\p{White_Space}*$/u;

/** `tasks.json` 내용을 읽는다. 깨짐의 기준은 STORE-08, v1.4 형식은 STORE-12, 더 새 버전은 STORE-14. */
export function decodeTasks(text: string): DecodedTasks {
  let data: unknown;
  try {
    data = JSON.parse(stripBom(text));
  } catch {
    return broken('JSON 문법 오류 또는 빈 파일');
  }
  if (Array.isArray(data))
    return decodeItems(data, (t) => Timestamp.parseV1(t), 'v1');
  if (!isRecord(data) || !('version' in data))
    return broken('최상위가 배열도 version이 있는 객체도 아님');

  const version = data['version'];
  if (typeof version !== 'number' || !Number.isInteger(version))
    return broken('version이 정수가 아님');
  if (version > TASKS_FORMAT_VERSION)
    return { kind: 'newer', version };
  if (version !== TASKS_FORMAT_VERSION)
    return broken(`알 수 없는 version ${version}`);
  const tasks = data['tasks'];
  if (!Array.isArray(tasks))
    return broken('tasks가 배열이 아님');
  return decodeItems(tasks, (t) => Timestamp.parse(t), 'v2');
}

/** v2 형식으로 쓴다. 들여쓰기 2칸, 한글은 그대로 (STORE-03, STORE-04). */
export function encodeTasks(items: readonly TodoItem[]): string {
  const tasks = items.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    createdAt: item.createdAt.format(),
    completedAt: item.completedAt ? item.completedAt.format() : null,
  }));
  return `${JSON.stringify({ version: TASKS_FORMAT_VERSION, tasks }, null, 2)}\n`;
}

function decodeItems(raw: unknown[], parseTime: ParseTime, kind: 'v1' | 'v2'): DecodedTasks {
  const items: TodoItem[] = [];
  for (const [index, entry] of raw.entries()) {
    const item = decodeItem(entry, parseTime);
    if (typeof item === 'string')
      return broken(`${index}번째 항목: ${item}`);
    items.push(item);
  }
  return { kind, items };
}

/** 할 일 하나. 문제가 있으면 이유 문자열을 돌려준다. */
function decodeItem(entry: unknown, parseTime: ParseTime): TodoItem | string {
  if (!isRecord(entry))
    return '비어 있거나 객체가 아님';
  const { id, title, status, createdAt, completedAt } = entry;
  if (typeof id !== 'string' || BLANK.test(id))
    return 'id가 없음';
  if (typeof title !== 'string' || BLANK.test(title))
    return 'title이 없음';
  if (!isTodoStatus(status))
    return '알 수 없는 status';
  const created = typeof createdAt === 'string' ? parseTime(createdAt) : null;
  if (!created)
    return 'createdAt 형식 오류';
  let completed: Timestamp | null = null;
  if (completedAt !== null && completedAt !== undefined) {
    completed = typeof completedAt === 'string' ? parseTime(completedAt) : null;
    if (!completed)
      return 'completedAt 형식 오류';
  }
  // 끝낸 일이 아닌 항목의 끝낸 시각은 없는 것으로 읽는다 (STORE-09).
  return { id, title, status, createdAt: created, completedAt: status === 'done' ? completed : null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function broken(reason: string): DecodedTasks {
  return { kind: 'broken', reason };
}
```

- [ ] **Step 3: 통과 확인과 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`

```bash
git add -A
git commit -m "feat: tasks.json v2 읽기·쓰기와 v1.4 형식 읽기 추가"
```

---

### Task 10: 할 일 저장소 (TaskRepository)

**Files:**
- Create: `src/application/ports/file-store.ts`, `src/application/storage/task-repository.ts`, `src/testing/memory-file-store.ts`
- Test: `src/application/storage/task-repository.test.ts`

**Interfaces:**
- Consumes: `decodeTasks`, `encodeTasks` (Task 9), `Clock`, `FakeClock` (Task 2)
- Produces:
  - `interface FileStore` — `read(name: string): Promise<string | null>`(없으면 null, 읽지 못하면 `FileAccessError`), `writeAtomic(name: string, text: string): Promise<void>`(STORE-02, 실패하면 `FileAccessError`), `exists(name: string): Promise<boolean>`, `rename(from: string, to: string): Promise<void>`, `copy(from: string, to: string): Promise<void>`, `displayPath(name: string): string`. `name`은 데이터 폴더 안의 파일 이름이다.
  - `class FileAccessError extends Error`
  - `TASKS_FILE = 'tasks.json'`, `class CannotOpenError extends Error { readonly path: string; readonly detail: string }`
  - `type TaskLoadMode = 'normal' | 'pendingConversion' | 'readOnly'`
  - `interface TaskLoad { items: TodoItem[]; mode: TaskLoadMode; notice: 'backup' | 'newerFile' | null; saveFailed: boolean }`
  - `class TaskRepository` — `constructor(files: FileStore, clock: Clock)`, `load(): Promise<TaskLoad>`(읽지 못하거나 깨진 파일 이름을 못 바꾸면 `CannotOpenError`), `save(items): Promise<void>`(`FileAccessError`), `convert(items): Promise<void>`(v1 백업 복사 후 저장, `FileAccessError`)
  - 테스트용 `class MemoryFileStore implements FileStore` — `files: Map<string, string>`, `unreadable: Set<string>`, `failWrites`, `failCopy`, `failRename`(불리언), `writes: string[]`(성공한 쓰기의 파일 이름 순서), `displayPath(name)`은 `/data/<name>`

- [ ] **Step 1: port와 가짜 작성**

`src/application/ports/file-store.ts`:

```ts
/** 데이터 폴더 안의 파일을 읽고 쓰는 일이 실패했다. */
export class FileAccessError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'FileAccessError';
  }
}

/**
 * 데이터 폴더(WIN-01, MAC-01, STORE-18)의 파일. `name`은 폴더 안의 파일 이름이다.
 * 실제 구현은 계획 4의 Rust 명령이다.
 */
export interface FileStore {
  /** 없으면 null. 있는데 읽지 못하면 FileAccessError. */
  read(name: string): Promise<string | null>;
  /** 임시 파일에 쓰고 flush한 뒤 원본과 바꾼다. 폴더가 없으면 만든다 (STORE-02). 실패하면 FileAccessError. */
  writeAtomic(name: string, text: string): Promise<void>;
  exists(name: string): Promise<boolean>;
  /** 실패하면 FileAccessError. */
  rename(from: string, to: string): Promise<void>;
  /** 실패하면 FileAccessError. */
  copy(from: string, to: string): Promise<void>;
  /** 대화 상자에 보여 줄 전체 경로 (STORE-10). */
  displayPath(name: string): string;
}
```

`src/testing/memory-file-store.ts`:

```ts
import { FileAccessError, type FileStore } from '../application/ports/file-store.ts';

/** 테스트용 메모리 데이터 폴더. 실패를 일부러 낼 수 있다. */
export class MemoryFileStore implements FileStore {
  readonly files = new Map<string, string>();
  readonly unreadable = new Set<string>();
  readonly writes: string[] = [];
  failWrites = false;
  failCopy = false;
  failRename = false;

  async read(name: string): Promise<string | null> {
    if (this.unreadable.has(name))
      throw new FileAccessError(`${name}을 읽지 못했어요 (잠김)`);
    return this.files.get(name) ?? null;
  }

  async writeAtomic(name: string, text: string): Promise<void> {
    if (this.failWrites)
      throw new FileAccessError(`${name}을 쓰지 못했어요`);
    this.files.set(name, text);
    this.writes.push(name);
  }

  async exists(name: string): Promise<boolean> {
    return this.files.has(name);
  }

  async rename(from: string, to: string): Promise<void> {
    const text = this.files.get(from);
    if (this.failRename || text === undefined)
      throw new FileAccessError(`${from}의 이름을 바꾸지 못했어요`);
    this.files.delete(from);
    this.files.set(to, text);
  }

  async copy(from: string, to: string): Promise<void> {
    const text = this.files.get(from);
    if (this.failCopy || text === undefined)
      throw new FileAccessError(`${from}을 복사하지 못했어요`);
    this.files.set(to, text);
  }

  displayPath(name: string): string {
    return `/data/${name}`;
  }
}
```

- [ ] **Step 2: 실패하는 테스트**

`src/application/storage/task-repository.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeClock, ts } from '../../testing/fake-clock.ts';
import { MemoryFileStore } from '../../testing/memory-file-store.ts';
import { CannotOpenError, TASKS_FILE, TaskRepository } from './task-repository.ts';
import { encodeTasks } from './tasks-codec.ts';

const V1 = JSON.stringify([
  { id: 'a', title: '보고서 초안 쓰기', status: 'doing', createdAt: '2026-09-30 09:12:40', completedAt: null },
  { id: 'b', title: '은행 방문', status: 'done', createdAt: '2026-09-29 08:00:00', completedAt: '2026-09-30 14:05:00' },
]);
const V2 = encodeTasks([{ id: 'x', title: '할 일', status: 'todo', createdAt: ts('2026-10-03T08:00:00+09:00'), completedAt: null }]);

let files: MemoryFileStore;
let repo: TaskRepository;

beforeEach(() => {
  files = new MemoryFileStore();
  repo = new TaskRepository(files, new FakeClock('2026-10-03T09:00:00+09:00'));
});

describe('불러오기', () => {
  it('STORE-07 tasks.json이 없으면 빈 목록이고 아무것도 쓰지 않는다', async () => {
    expect(await repo.load()).toEqual({ items: [], mode: 'normal', notice: null, saveFailed: false });
    expect(files.files.size).toBe(0);
  });

  it('v2 파일은 그대로 읽는다', async () => {
    files.files.set(TASKS_FILE, V2);
    const load = await repo.load();
    expect(load.items.map((i) => i.title)).toEqual(['할 일']);
    expect(load.mode).toBe('normal');
    expect([...files.files.keys()]).toEqual([TASKS_FILE]);
  });

  it('STORE-08 깨진 파일은 내용 그대로 이름만 바꾸고 빈 목록과 백업 안내로 시작한다', async () => {
    files.files.set(TASKS_FILE, '{깨짐');
    expect(await repo.load()).toEqual({ items: [], mode: 'normal', notice: 'backup', saveFailed: false });
    expect(files.files.has(TASKS_FILE)).toBe(false);
    expect(files.files.get('tasks.broken-20261003-090000.json')).toBe('{깨짐');
  });

  it('STORE-08 같은 이름의 백업이 있으면 -2, -3을 붙여 덮어쓰지 않는다', async () => {
    files.files.set('tasks.broken-20261003-090000.json', '첫 백업');
    files.files.set('tasks.broken-20261003-090000-2.json', '둘째 백업');
    files.files.set(TASKS_FILE, '{깨짐');
    await repo.load();
    expect(files.files.get('tasks.broken-20261003-090000.json')).toBe('첫 백업');
    expect(files.files.get('tasks.broken-20261003-090000-2.json')).toBe('둘째 백업');
    expect(files.files.get('tasks.broken-20261003-090000-3.json')).toBe('{깨짐');
  });

  it('STORE-10 읽지 못하는 tasks.json은 덮어쓰지 않고 경로와 이유를 담아 알린다', async () => {
    files.files.set(TASKS_FILE, V2);
    files.unreadable.add(TASKS_FILE);
    const error = await repo.load().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CannotOpenError);
    expect((error as CannotOpenError).path).toBe('/data/tasks.json');
    expect((error as CannotOpenError).detail).toContain('읽지 못했어요');
    expect(files.files.get(TASKS_FILE)).toBe(V2);
  });

  it('STORE-10 깨진 파일의 이름을 바꾸지 못하면 같은 방식으로 알리고 원본을 남긴다', async () => {
    files.files.set(TASKS_FILE, '{깨짐');
    files.failRename = true;
    await expect(repo.load()).rejects.toBeInstanceOf(CannotOpenError);
    expect(files.files.get(TASKS_FILE)).toBe('{깨짐');
  });

  it('STORE-12 v1.4 파일은 백업을 복사하고 v2로 바꿔 저장한다', async () => {
    files.files.set(TASKS_FILE, V1);
    const load = await repo.load();
    expect(load).toMatchObject({ mode: 'normal', notice: null, saveFailed: false });
    expect(load.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(files.files.get('tasks.v1-backup-20261003-090000.json')).toBe(V1);
    expect(JSON.parse(files.files.get(TASKS_FILE) ?? '')).toEqual(JSON.parse(encodeTasks(load.items)));
    expect(JSON.parse(files.files.get(TASKS_FILE) ?? '').tasks[1].completedAt).toBe('2026-09-30T14:05:00+09:00');
  });

  it('STORE-12 v1 백업 이름이 겹치면 -2를 붙이고, 이미 v2면 백업도 변환도 하지 않는다', async () => {
    files.files.set('tasks.v1-backup-20261003-090000.json', '예전 백업');
    files.files.set(TASKS_FILE, V1);
    await repo.load();
    expect(files.files.get('tasks.v1-backup-20261003-090000-2.json')).toBe(V1);

    const fresh = new MemoryFileStore();
    fresh.files.set(TASKS_FILE, V2);
    await new TaskRepository(fresh, new FakeClock()).load();
    expect([...fresh.files.keys()]).toEqual([TASKS_FILE]);
    expect(fresh.writes).toEqual([]);
  });

  it('STORE-12 v1 형식인데 깨졌으면 변환하지 않고 STORE-08을 따른다', async () => {
    files.files.set(TASKS_FILE, JSON.stringify([{ id: 'a', title: '보고서', status: 'todo', createdAt: '어제' }]));
    const load = await repo.load();
    expect(load.notice).toBe('backup');
    expect([...files.files.keys()].some((k) => k.startsWith('tasks.v1-backup'))).toBe(false);
  });

  it('STORE-12 백업은 했지만 변환한 내용을 저장하지 못하면 저장 실패로 시작한다', async () => {
    files.files.set(TASKS_FILE, V1);
    files.failWrites = true;
    const load = await repo.load();
    expect(load).toMatchObject({ mode: 'normal', saveFailed: true });
    expect(load.items).toHaveLength(2);
    expect(files.files.get(TASKS_FILE)).toBe(V1);
    expect(files.files.get('tasks.v1-backup-20261003-090000.json')).toBe(V1);
  });

  it('STORE-13 변환용 백업에 실패하면 변환하지 않고 할 일만 보여 준다', async () => {
    files.files.set(TASKS_FILE, V1);
    files.failCopy = true;
    const load = await repo.load();
    expect(load).toMatchObject({ mode: 'pendingConversion', notice: null, saveFailed: true });
    expect(load.items).toHaveLength(2);
    expect(files.files.get(TASKS_FILE)).toBe(V1);
    expect(files.writes).toEqual([]);
  });

  it('STORE-14 더 새 버전 파일은 읽지도, 바꾸지도, 백업하지도 않는다', async () => {
    const newer = '{"version":3,"tasks":[]}';
    files.files.set(TASKS_FILE, newer);
    expect(await repo.load()).toEqual({ items: [], mode: 'readOnly', notice: 'newerFile', saveFailed: false });
    expect([...files.files.entries()]).toEqual([[TASKS_FILE, newer]]);
  });
});

describe('저장', () => {
  it('save는 v2 형식으로 tasks.json에 쓴다', async () => {
    const items = [{ id: 'x', title: '할 일', status: 'todo' as const, createdAt: ts('2026-10-03T08:00:00+09:00'), completedAt: null }];
    await repo.save(items);
    expect(files.files.get(TASKS_FILE)).toBe(encodeTasks(items));
  });
});
```

Run: `pnpm vitest run src/application/storage/task-repository.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`src/application/storage/task-repository.ts`:

```ts
import type { Clock } from '../../domain/clock.ts';
import type { TodoItem } from '../../domain/todo-item.ts';
import { FileAccessError, type FileStore } from '../ports/file-store.ts';
import { decodeTasks, encodeTasks } from './tasks-codec.ts';

export const TASKS_FILE = 'tasks.json';
const BROKEN_PREFIX = 'tasks.broken';
const V1_BACKUP_PREFIX = 'tasks.v1-backup';

/** tasks.json을 읽을 수 없다. 원본을 덮어쓰지 않도록 앱을 띄우지 않는다 (STORE-10). */
export class CannotOpenError extends Error {
  readonly path: string;
  readonly detail: string;

  constructor(path: string, detail: string, options?: ErrorOptions) {
    super(`${path}: ${detail}`, options);
    this.name = 'CannotOpenError';
    this.path = path;
    this.detail = detail;
  }
}

/** normal: 평소. pendingConversion: v1 백업에 실패해 다음 변경 때 다시 변환한다(STORE-13). readOnly: 더 새 버전 파일이라 저장하지 않는다(STORE-14). */
export type TaskLoadMode = 'normal' | 'pendingConversion' | 'readOnly';

export interface TaskLoad {
  items: TodoItem[];
  mode: TaskLoadMode;
  notice: 'backup' | 'newerFile' | null;
  saveFailed: boolean;
}

export class TaskRepository {
  readonly #files: FileStore;
  readonly #clock: Clock;

  constructor(files: FileStore, clock: Clock) {
    this.#files = files;
    this.#clock = clock;
  }

  async load(): Promise<TaskLoad> {
    let text: string | null;
    try {
      text = await this.#files.read(TASKS_FILE);
    } catch (error) {
      throw this.#cannotOpen(error);
    }
    if (text === null)
      return ready([]);

    const decoded = decodeTasks(text);
    switch (decoded.kind) {
      case 'v2':
        return ready(decoded.items);
      case 'newer':
        return { items: [], mode: 'readOnly', notice: 'newerFile', saveFailed: false };
      case 'broken':
        try {
          await this.#files.rename(TASKS_FILE, await this.#freeName(BROKEN_PREFIX));
        } catch (error) {
          throw this.#cannotOpen(error);
        }
        return { items: [], mode: 'normal', notice: 'backup', saveFailed: false };
      case 'v1':
        return this.#convertOnLoad(decoded.items);
    }
  }

  async save(items: readonly TodoItem[]): Promise<void> {
    await this.#files.writeAtomic(TASKS_FILE, encodeTasks(items));
  }

  /** v1.4 원본을 백업한 뒤 v2로 저장한다 (STORE-12, STORE-13의 다시 시도). 실패하면 FileAccessError. */
  async convert(items: readonly TodoItem[]): Promise<void> {
    await this.#backUpV1();
    await this.save(items);
  }

  async #convertOnLoad(items: TodoItem[]): Promise<TaskLoad> {
    try {
      await this.#backUpV1();
    } catch (error) {
      if (!(error instanceof FileAccessError))
        throw error;
      return { items, mode: 'pendingConversion', notice: null, saveFailed: true };
    }
    try {
      await this.save(items);
    } catch (error) {
      if (!(error instanceof FileAccessError))
        throw error;
      return { items, mode: 'normal', notice: null, saveFailed: true };
    }
    return ready(items);
  }

  async #backUpV1(): Promise<void> {
    await this.#files.copy(TASKS_FILE, await this.#freeName(V1_BACKUP_PREFIX));
  }

  /** `prefix-yyyyMMdd-HHmmss.json`, 이미 있으면 `-2`, `-3`… (STORE-08, STORE-12). */
  async #freeName(prefix: string): Promise<string> {
    const base = `${prefix}-${this.#clock.now().compactStamp()}`;
    let name = `${base}.json`;
    for (let n = 2; await this.#files.exists(name); n++)
      name = `${base}-${n}.json`;
    return name;
  }

  #cannotOpen(error: unknown): CannotOpenError {
    const detail = error instanceof Error ? error.message : String(error);
    return new CannotOpenError(this.#files.displayPath(TASKS_FILE), detail, { cause: error });
  }
}

function ready(items: TodoItem[]): TaskLoad {
  return { items, mode: 'normal', notice: null, saveFailed: false };
}
```

- [ ] **Step 4: 통과 확인과 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`

```bash
git add -A
git commit -m "feat: 할 일 저장소 — 깨진 파일 백업, v1.4 변환, 새 버전 파일 보호"
```

---

### Task 11: 설정 읽기·쓰기와 설정 서비스

**Files:**
- Create: `src/application/settings/settings-codec.ts`, `src/application/settings/settings-repository.ts`, `src/application/settings/settings-service.ts`
- Test: `src/application/settings/settings-codec.test.ts`, `src/application/settings/settings-service.test.ts`

**Interfaces:**
- Consumes: `FileStore`, `MemoryFileStore` (Task 10), `stripBom` (Task 9), `Timestamp` (Task 2)
- Produces:
  - `interface WidgetSettings { readonly left: number | null; readonly top: number | null; readonly width: number | null; readonly maxHeight: number | null; readonly opacity: number | null; readonly pinned: boolean; readonly doneExpanded: boolean; readonly todoExpanded: boolean; readonly lastUpdateCheck: Timestamp | null }`, `DEFAULT_SETTINGS`
  - `interface DecodedSettings { settings: WidgetSettings; unknown: Readonly<Record<string, unknown>> }`
  - `decodeSettings(text: string | null): DecodedSettings`, `encodeSettings(settings: WidgetSettings, unknown: Readonly<Record<string, unknown>>): string`
  - `SETTINGS_FILE = 'settings.json'`
  - `class SettingsRepository` — `constructor(files: FileStore)`, `exists(): Promise<boolean>`, `load(): Promise<WidgetSettings>`, `save(settings): Promise<boolean>`(실패하면 false, 알리지 않음)
  - `class SettingsService` — `static open(repo: SettingsRepository): Promise<SettingsService>`, `get current(): WidgetSettings`, `update(patch: Partial<WidgetSettings>): Promise<void>`(바꾸고 저장), `stage(patch: Partial<WidgetSettings>): void`(저장 없이), `save(): Promise<boolean>`

- [ ] **Step 1: 실패하는 테스트**

`src/application/settings/settings-codec.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ts } from '../../testing/fake-clock.ts';
import { DEFAULT_SETTINGS, decodeSettings, encodeSettings } from './settings-codec.ts';

describe('settings.json 읽기', () => {
  it('STORE-15 파일이 없거나, 문법 오류·빈 파일·null·객체가 아니면 모두 기본값이다', () => {
    for (const text of [null, '{', '', 'null', '[]', '3', '"설정"'])
      expect(decodeSettings(text), String(text)).toEqual({ settings: DEFAULT_SETTINGS, unknown: {} });
  });

  it('STORE-15 기본값은 위치·크기·투명도 없음, 고정 켜짐, 끝낸 일 접힘, 할 일 펼침, 확인 시각 없음이다', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      left: null,
      top: null,
      width: null,
      maxHeight: null,
      opacity: null,
      pinned: true,
      doneExpanded: false,
      todoExpanded: true,
      lastUpdateCheck: null,
    });
  });

  it('STORE-15 항목마다 따로 판단해 틀린 항목만 기본값을 쓴다', () => {
    const { settings } = decodeSettings('{"left": 10, "pinned": "yes", "doneExpanded": null, "width": "넓게", "opacity": 0.8}');
    expect(settings).toMatchObject({ left: 10, pinned: true, doneExpanded: false, width: null, opacity: 0.8 });
  });

  it('STORE-15 todoExpanded가 없는 예전 파일은 할 일 섹션이 펼쳐진다', () => {
    expect(decodeSettings('{"pinned": false}').settings).toMatchObject({ pinned: false, todoExpanded: true });
  });

  it('STORE-15 lastUpdateCheck는 STORE-05 형식일 때만 읽는다', () => {
    expect(decodeSettings('{"lastUpdateCheck": "2026-10-03T09:00:00+09:00"}').settings.lastUpdateCheck?.format()).toBe('2026-10-03T09:00:00+09:00');
    expect(decodeSettings('{"lastUpdateCheck": "2026-10-03 09:00:00"}').settings.lastUpdateCheck).toBeNull();
  });

  it('STORE-15 모르는 항목은 따로 모아 둔다', () => {
    expect(decodeSettings('{"left": 1, "doingExpanded": true, "future": {"a": 1}}').unknown).toEqual({ doingExpanded: true, future: { a: 1 } });
  });

  it('STORE-19 맨 앞 BOM 하나는 무시한다', () => {
    expect(decodeSettings('﻿{"pinned": false}').settings.pinned).toBe(false);
  });
});

describe('settings.json 쓰기', () => {
  it('STORE-03 들여쓴 JSON이고 BOM이 없다', () => {
    const text = encodeSettings(DEFAULT_SETTINGS, {});
    expect(text).toContain('\n  "pinned": true');
    expect(text.startsWith('﻿')).toBe(false);
  });

  it('STORE-15 모르는 항목을 이름과 값 그대로 남긴다', () => {
    const json = JSON.parse(encodeSettings(DEFAULT_SETTINGS, { doingExpanded: true, future: { a: 1 } }));
    expect(json.doingExpanded).toBe(true);
    expect(json.future).toEqual({ a: 1 });
    expect(json.pinned).toBe(true);
  });

  it('STORE-16 NaN·무한대인 숫자는 null로 쓰고 나머지는 그대로 쓴다', () => {
    const json = JSON.parse(encodeSettings({ ...DEFAULT_SETTINGS, left: NaN, top: Infinity, width: 400, maxHeight: -Infinity, opacity: 0.9 }, {}));
    expect(json).toMatchObject({ left: null, top: null, width: 400, maxHeight: null, opacity: 0.9 });
  });

  it('lastUpdateCheck는 STORE-05 형식으로 쓴다', () => {
    const json = JSON.parse(encodeSettings({ ...DEFAULT_SETTINGS, lastUpdateCheck: ts('2026-10-03T09:00:00+09:00') }, {}));
    expect(json.lastUpdateCheck).toBe('2026-10-03T09:00:00+09:00');
  });
});
```

`src/application/settings/settings-service.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryFileStore } from '../../testing/memory-file-store.ts';
import { SETTINGS_FILE, SettingsRepository } from './settings-repository.ts';
import { SettingsService } from './settings-service.ts';

let files: MemoryFileStore;

beforeEach(() => {
  files = new MemoryFileStore();
});

async function open(): Promise<SettingsService> {
  return SettingsService.open(new SettingsRepository(files));
}

function saved(): Record<string, unknown> {
  return JSON.parse(files.files.get(SETTINGS_FILE) ?? 'null');
}

describe('설정 서비스', () => {
  it('LIST-09 접힘 상태를 바꾸면 바로 저장하고 다음에 켤 때 그대로 쓴다', async () => {
    const service = await open();
    await service.update({ doneExpanded: true, todoExpanded: false });
    expect(saved()).toMatchObject({ doneExpanded: true, todoExpanded: false });
    expect((await open()).current).toMatchObject({ doneExpanded: true, todoExpanded: false });
  });

  it('WND-09 맨 위 고정은 기본이 켜짐이고, 바꾸면 저장해 다음에 켤 때 적용한다', async () => {
    const service = await open();
    expect(service.current.pinned).toBe(true);
    await service.update({ pinned: false });
    expect(saved()).toMatchObject({ pinned: false });
    expect((await open()).current.pinned).toBe(false);
  });

  it('WND-14 닫을 때 위치와 접힘 상태를 다른 설정과 함께 한 번에 저장한다', async () => {
    const service = await open();
    service.stage({ opacity: 0.8 });
    await service.update({ left: 100, top: 200, doneExpanded: true, todoExpanded: true });
    expect(saved()).toMatchObject({ left: 100, top: 200, doneExpanded: true, todoExpanded: true, opacity: 0.8 });
    expect(files.writes).toHaveLength(1);
  });

  it('stage는 저장하지 않고, save가 그때의 설정을 저장한다', async () => {
    const service = await open();
    service.stage({ opacity: 0.7 });
    expect(files.writes).toHaveLength(0);
    expect(await service.save()).toBe(true);
    expect(saved()).toMatchObject({ opacity: 0.7 });
  });

  it('STORE-17 설정을 쓰지 못해도 알리지 않고, 바꾼 값은 그대로 적용된 채다', async () => {
    const service = await open();
    files.failWrites = true;
    await expect(service.update({ pinned: false })).resolves.toBeUndefined();
    expect(service.current.pinned).toBe(false);
    expect(await service.save()).toBe(false);
    files.failWrites = false;
    await service.update({ left: 5 });
    expect(saved()).toMatchObject({ pinned: false, left: 5 });
  });

  it('STORE-15 모르는 항목은 다음 설정 저장 때 남기고, 객체가 아닌 깨진 파일은 표의 항목만 써서 덮어쓴다', async () => {
    files.files.set(SETTINGS_FILE, '{"left": 1, "doingExpanded": true}');
    await (await open()).update({ pinned: false });
    expect(saved()).toMatchObject({ left: 1, doingExpanded: true, pinned: false });

    files.files.set(SETTINGS_FILE, '[1, 2]');
    await (await open()).update({ pinned: false });
    expect(Object.keys(saved()).sort()).toEqual(
      ['doneExpanded', 'lastUpdateCheck', 'left', 'maxHeight', 'opacity', 'pinned', 'todoExpanded', 'top', 'width'],
    );
  });

  it('STORE-15 읽지 못하는 settings.json은 기본값을 쓴다', async () => {
    files.files.set(SETTINGS_FILE, '{"pinned": false}');
    files.unreadable.add(SETTINGS_FILE);
    expect((await open()).current.pinned).toBe(true);
  });

  it('exists는 settings.json이 있는지 알려 준다 (처음 실행 판단)', async () => {
    const repo = new SettingsRepository(files);
    expect(await repo.exists()).toBe(false);
    files.files.set(SETTINGS_FILE, '{}');
    expect(await repo.exists()).toBe(true);
  });
});
```

Run: `pnpm vitest run src/application/settings`
Expected: FAIL (모듈 없음)

- [ ] **Step 2: 구현**

`src/application/settings/settings-codec.ts`:

```ts
import { Timestamp } from '../../domain/timestamp.ts';
import { stripBom } from '../storage/bom.ts';

export interface WidgetSettings {
  readonly left: number | null;
  readonly top: number | null;
  readonly width: number | null;
  readonly maxHeight: number | null;
  readonly opacity: number | null;
  readonly pinned: boolean;
  readonly doneExpanded: boolean;
  readonly todoExpanded: boolean;
  readonly lastUpdateCheck: Timestamp | null;
}

/** storage.md `settings.json` 항목 표의 기본값. */
export const DEFAULT_SETTINGS: WidgetSettings = {
  left: null,
  top: null,
  width: null,
  maxHeight: null,
  opacity: null,
  pinned: true,
  doneExpanded: false,
  todoExpanded: true,
  lastUpdateCheck: null,
};

const KNOWN_KEYS: ReadonlySet<string> = new Set(Object.keys(DEFAULT_SETTINGS));

export interface DecodedSettings {
  settings: WidgetSettings;
  /** 표에 없는 항목. 다음 저장 때 그대로 남긴다 (STORE-15). */
  unknown: Readonly<Record<string, unknown>>;
}

/** 없거나 깨지면 기본값, 객체면 항목마다 따로 판단한다. 안내는 없다 (STORE-15, STORE-19). */
export function decodeSettings(text: string | null): DecodedSettings {
  if (text === null)
    return defaults();
  let data: unknown;
  try {
    data = JSON.parse(stripBom(text));
  } catch {
    return defaults();
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data))
    return defaults();

  const record = data as Record<string, unknown>;
  const number = (key: string): number | null => {
    const value = record[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  };
  const boolean = (key: string, fallback: boolean): boolean => {
    const value = record[key];
    return typeof value === 'boolean' ? value : fallback;
  };
  const lastUpdateCheck = record['lastUpdateCheck'];

  return {
    settings: {
      left: number('left'),
      top: number('top'),
      width: number('width'),
      maxHeight: number('maxHeight'),
      opacity: number('opacity'),
      pinned: boolean('pinned', DEFAULT_SETTINGS.pinned),
      doneExpanded: boolean('doneExpanded', DEFAULT_SETTINGS.doneExpanded),
      todoExpanded: boolean('todoExpanded', DEFAULT_SETTINGS.todoExpanded),
      lastUpdateCheck: typeof lastUpdateCheck === 'string' ? Timestamp.parse(lastUpdateCheck) : null,
    },
    unknown: Object.fromEntries(Object.entries(record).filter(([key]) => !KNOWN_KEYS.has(key))),
  };
}

/** 표의 항목 다음에 모르는 항목을 그대로 붙인다. NaN·무한대는 null (STORE-03, STORE-15, STORE-16). */
export function encodeSettings(settings: WidgetSettings, unknown: Readonly<Record<string, unknown>>): string {
  const finite = (value: number | null): number | null => (value !== null && Number.isFinite(value) ? value : null);
  const body = {
    left: finite(settings.left),
    top: finite(settings.top),
    width: finite(settings.width),
    maxHeight: finite(settings.maxHeight),
    opacity: finite(settings.opacity),
    pinned: settings.pinned,
    doneExpanded: settings.doneExpanded,
    todoExpanded: settings.todoExpanded,
    lastUpdateCheck: settings.lastUpdateCheck ? settings.lastUpdateCheck.format() : null,
    ...unknown,
  };
  return `${JSON.stringify(body, null, 2)}\n`;
}

function defaults(): DecodedSettings {
  return { settings: DEFAULT_SETTINGS, unknown: {} };
}
```

`src/application/settings/settings-repository.ts`:

```ts
import type { FileStore } from '../ports/file-store.ts';
import { type WidgetSettings, decodeSettings, encodeSettings } from './settings-codec.ts';

export const SETTINGS_FILE = 'settings.json';

export class SettingsRepository {
  readonly #files: FileStore;
  #unknown: Readonly<Record<string, unknown>> = {};

  constructor(files: FileStore) {
    this.#files = files;
  }

  /** settings.json이 있으면 처음 실행이 아니다 (START-02). 있는지 알 수 없으면 있다고 본다(꺼 둔 자동 실행을 다시 켜지 않으려고). */
  async exists(): Promise<boolean> {
    try {
      return await this.#files.exists(SETTINGS_FILE);
    } catch {
      return true;
    }
  }

  /** 읽지 못하면 기본값 (STORE-15). */
  async load(): Promise<WidgetSettings> {
    let text: string | null = null;
    try {
      text = await this.#files.read(SETTINGS_FILE);
    } catch {
      text = null;
    }
    const decoded = decodeSettings(text);
    this.#unknown = decoded.unknown;
    return decoded.settings;
  }

  /** 실패하면 false. 알리지 않는다 (STORE-17). */
  async save(settings: WidgetSettings): Promise<boolean> {
    try {
      await this.#files.writeAtomic(SETTINGS_FILE, encodeSettings(settings, this.#unknown));
      return true;
    } catch {
      return false;
    }
  }
}
```

`src/application/settings/settings-service.ts`:

```ts
import type { WidgetSettings } from './settings-codec.ts';
import type { SettingsRepository } from './settings-repository.ts';

/** 지금 설정. 바꾸면 바로 저장하고(WND-02, WND-09, LIST-09), 실패는 조용히 넘어간다(STORE-17). */
export class SettingsService {
  readonly #repo: SettingsRepository;
  #current: WidgetSettings;

  private constructor(repo: SettingsRepository, current: WidgetSettings) {
    this.#repo = repo;
    this.#current = current;
  }

  static async open(repo: SettingsRepository): Promise<SettingsService> {
    return new SettingsService(repo, await repo.load());
  }

  get current(): WidgetSettings {
    return this.#current;
  }

  async update(patch: Partial<WidgetSettings>): Promise<void> {
    this.stage(patch);
    await this.save();
  }

  /** 저장 없이 바꾼다. 투명도를 끄는 동안처럼 나중에 한 번 저장할 때 쓴다 (WND-12). */
  stage(patch: Partial<WidgetSettings>): void {
    this.#current = { ...this.#current, ...patch };
  }

  save(): Promise<boolean> {
    return this.#repo.save(this.#current);
  }
}
```

- [ ] **Step 3: 통과 확인과 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`

```bash
git add -A
git commit -m "feat: 설정 읽기·쓰기(항목별 기본값, 모르는 항목 보존)와 설정 서비스 추가"
```

---

### Task 12: 할 일 세션과 안내 줄 우선순위

**Files:**
- Create: `src/application/todo-session.ts`, `src/application/notices.ts`
- Test: `src/application/todo-session.test.ts`, `src/application/notices.test.ts`

**Interfaces:**
- Consumes: `TodoList` (Task 4, 5), `TaskRepository`, `TaskLoad`, `TaskLoadMode`, `FileAccessError`, `MemoryFileStore` (Task 10)
- Produces:
  - `class TodoSession` — `static open(repo: TaskRepository, clock: Clock, newId: IdGenerator): Promise<TodoSession>`(`CannotOpenError`를 그대로 던진다), `get items()`, `todoSection()`, `doneSection()`, `get remainingCount()`, `get saveFailed(): boolean`, `get fileNotice(): 'backup' | 'newerFile' | null`, `onChange(listener: () => void): () => void`, `add(text: string): Promise<boolean>`(줄마다, `addLines` 규칙), `cycle(id)`, `setStatus(id, status)`, `rename(id, title)`, `remove(id)`, `clear()` — 모두 `Promise<boolean>`(변경 없음이면 false). 저장은 순서대로 한 번에 하나씩 하고, 늘 그 순간의 전체 목록을 쓴다.
  - `type UpdateNoticeState = 'none' | 'available' | 'installing' | 'failed'`
  - `interface NoticeState { saveFailed: boolean; fileProblem: 'newerFile' | 'backup' | null; autoStartFailed: boolean; update: UpdateNoticeState }`
  - `type NoticeKey = 'notice.saveFailed' | 'notice.newerFile' | 'notice.backup' | 'notice.autoStartFailed' | 'update.available' | 'update.installing' | 'update.failed'`
  - `interface NoticeLine { messages: NoticeKey[]; action: boolean }` (`action`은 `update.action` 버튼을 보일지)
  - `pickNotice(state: NoticeState): NoticeLine | null`

- [ ] **Step 1: 실패하는 테스트**

`src/application/notices.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { type NoticeState, pickNotice } from './notices.ts';

const quiet: NoticeState = { saveFailed: false, fileProblem: null, autoStartFailed: false, update: 'none' };
const pick = (patch: Partial<NoticeState>) => pickNotice({ ...quiet, ...patch });

describe('안내 줄', () => {
  it('START-09 알릴 일이 없으면 안내 줄이 없다', () => {
    expect(pick({})).toBeNull();
  });

  it('START-09 할 일 저장 실패 > 파일 문제 > 자동 실행 실패 > 업데이트 순으로 하나만 보인다', () => {
    expect(pick({ saveFailed: true, fileProblem: 'backup', autoStartFailed: true, update: 'available' })).toEqual({
      messages: ['notice.saveFailed'],
      action: false,
    });
    expect(pick({ fileProblem: 'backup', autoStartFailed: true, update: 'available' })).toEqual({ messages: ['notice.backup'], action: false });
    expect(pick({ fileProblem: 'newerFile' })).toEqual({ messages: ['notice.newerFile'], action: false });
    expect(pick({ autoStartFailed: true, update: 'available' })).toEqual({ messages: ['notice.autoStartFailed'], action: false });
  });

  it('START-09 업데이트 안내는 상태마다 문구와 버튼이 다르다', () => {
    expect(pick({ update: 'available' })).toEqual({ messages: ['update.available'], action: true });
    expect(pick({ update: 'installing' })).toEqual({ messages: ['update.installing'], action: false });
    expect(pick({ update: 'failed' })).toEqual({ messages: ['update.failed'], action: true });
  });

  it('START-09 새 버전 파일 안내 옆에는 업데이트 버튼이 함께 보이고, 설치 중과 실패는 그 자리에서 보인다', () => {
    expect(pick({ fileProblem: 'newerFile', update: 'available' })).toEqual({ messages: ['notice.newerFile'], action: true });
    expect(pick({ fileProblem: 'newerFile', update: 'installing' })).toEqual({ messages: ['update.installing'], action: false });
    expect(pick({ fileProblem: 'newerFile', update: 'failed' })).toEqual({ messages: ['notice.newerFile', 'update.failed'], action: true });
  });

  it('START-09 위 안내가 사라지면 다음 안내가 보인다', () => {
    const state: NoticeState = { saveFailed: true, fileProblem: null, autoStartFailed: true, update: 'none' };
    expect(pickNotice(state)?.messages).toEqual(['notice.saveFailed']);
    expect(pickNotice({ ...state, saveFailed: false })?.messages).toEqual(['notice.autoStartFailed']);
  });
});
```

`src/application/todo-session.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeClock } from '../testing/fake-clock.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { sequenceIds } from '../testing/sequence-ids.ts';
import { TASKS_FILE, TaskRepository } from './storage/task-repository.ts';
import { TodoSession } from './todo-session.ts';

const V1 = JSON.stringify([{ id: 'a', title: '보고서', status: 'todo', createdAt: '2026-09-30 09:12:40', completedAt: null }]);

let files: MemoryFileStore;
let clock: FakeClock;

beforeEach(() => {
  files = new MemoryFileStore();
  clock = new FakeClock('2026-10-03T09:00:00+09:00');
});

function open(): Promise<TodoSession> {
  return TodoSession.open(new TaskRepository(files, clock), clock, sequenceIds());
}

function savedTitles(): string[] {
  return JSON.parse(files.files.get(TASKS_FILE) ?? '{"tasks":[]}').tasks.map((t: { title: string }) => t.title);
}

describe('저장', () => {
  it('STORE-01 바뀔 때마다 바로 전체 목록을 저장한다', async () => {
    const session = await open();
    expect(await session.add('보고서')).toBe(true);
    expect(savedTitles()).toEqual(['보고서']);
    const id = session.items[0]?.id ?? '';
    await session.cycle(id);
    await session.rename(id, '보고서 초안');
    await session.setStatus(id, 'done');
    expect(files.writes).toHaveLength(4);
    expect(JSON.parse(files.files.get(TASKS_FILE) ?? '').tasks[0]).toMatchObject({ title: '보고서 초안', status: 'done' });
    await session.remove(id);
    expect(savedTitles()).toEqual([]);
  });

  it('STORE-01 변경 없음이면 저장하지 않는다', async () => {
    const session = await open();
    await session.add('보고서');
    const id = session.items[0]?.id ?? '';
    expect(await session.rename(id, ' 보고서 ')).toBe(false);
    expect(await session.cycle('없음')).toBe(false);
    expect(await session.add('   ')).toBe(false);
    expect(await session.clear()).toBe(true);
    expect(await session.clear()).toBe(false);
    expect(files.writes).toHaveLength(2);
  });

  it('STORE-01 여러 줄을 한꺼번에 추가해도 저장은 한 번이다', async () => {
    const session = await open();
    await session.add('은행\n택배\n보고서');
    expect(files.writes).toHaveLength(1);
    expect(savedTitles()).toEqual(['은행', '택배', '보고서']);
  });

  it('STORE-01 기다리지 않고 연달아 바꿔도 마지막에는 모든 변경이 저장된다', async () => {
    const session = await open();
    await Promise.all([session.add('하나'), session.add('둘'), session.add('셋')]);
    expect(savedTitles()).toEqual(['하나', '둘', '셋']);
  });

  it('바뀌면 화면에 알린다', async () => {
    const session = await open();
    let calls = 0;
    const stop = session.onChange(() => calls++);
    await session.add('보고서');
    expect(calls).toBeGreaterThan(0);
    stop();
    const before = calls;
    await session.add('택배');
    expect(calls).toBe(before);
  });
});

describe('저장 실패와 파일 문제', () => {
  it('STORE-11 저장에 실패해도 바꾼 내용은 남고, 다음 변경 때 전체를 다시 저장하고 성공하면 안내를 지운다', async () => {
    const session = await open();
    files.failWrites = true;
    expect(await session.add('보고서')).toBe(true);
    expect(session.items.map((i) => i.title)).toEqual(['보고서']);
    expect(session.saveFailed).toBe(true);

    expect(await session.cycle('없음')).toBe(false);
    expect(session.saveFailed).toBe(true);

    files.failWrites = false;
    await session.add('택배');
    expect(savedTitles()).toEqual(['보고서', '택배']);
    expect(session.saveFailed).toBe(false);
  });

  it('STORE-13 v1 백업에 실패했으면 바꿀 때마다 변환을 다시 시도하고, 성공하면 안내를 지운다', async () => {
    files.files.set(TASKS_FILE, V1);
    files.failCopy = true;
    const session = await open();
    expect(session.saveFailed).toBe(true);
    expect(session.items.map((i) => i.title)).toEqual(['보고서']);

    await session.add('택배');
    expect(session.saveFailed).toBe(true);
    expect(files.files.get(TASKS_FILE)).toBe(V1);

    files.failCopy = false;
    await session.add('은행');
    expect(session.saveFailed).toBe(false);
    expect(files.files.get('tasks.v1-backup-20261003-090000.json')).toBe(V1);
    expect(savedTitles()).toEqual(['보고서', '택배', '은행']);

    await session.add('하나 더');
    expect([...files.files.keys()].filter((k) => k.startsWith('tasks.v1-backup'))).toHaveLength(1);
  });

  it('STORE-14 새 버전 파일이면 바꿔도 저장하지 않고 저장 실패로도 보지 않는다', async () => {
    const newer = '{"version":3,"tasks":[]}';
    files.files.set(TASKS_FILE, newer);
    const session = await open();
    expect(session.fileNotice).toBe('newerFile');
    expect(await session.add('보고서')).toBe(true);
    expect(session.items).toHaveLength(1);
    expect(session.saveFailed).toBe(false);
    expect(files.files.get(TASKS_FILE)).toBe(newer);
    expect(files.writes).toEqual([]);
  });

  it('STORE-08 깨진 파일을 백업했으면 다시 켤 때까지 백업 안내가 남는다', async () => {
    files.files.set(TASKS_FILE, '{깨짐');
    const session = await open();
    expect(session.fileNotice).toBe('backup');
    await session.add('보고서');
    expect(session.fileNotice).toBe('backup');
    expect(savedTitles()).toEqual(['보고서']);
  });
});
```

Run: `pnpm vitest run src/application/notices.test.ts src/application/todo-session.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 2: 구현**

`src/application/notices.ts`:

```ts
export type UpdateNoticeState = 'none' | 'available' | 'installing' | 'failed';

export interface NoticeState {
  saveFailed: boolean;
  fileProblem: 'newerFile' | 'backup' | null;
  autoStartFailed: boolean;
  update: UpdateNoticeState;
}

export type NoticeKey =
  | 'notice.saveFailed'
  | 'notice.newerFile'
  | 'notice.backup'
  | 'notice.autoStartFailed'
  | 'update.available'
  | 'update.installing'
  | 'update.failed';

/** 안내 줄 하나. `action`이 true면 그 옆에 `update.action` 버튼을 보인다. */
export interface NoticeLine {
  messages: NoticeKey[];
  action: boolean;
}

/** 우선순위가 가장 높은 안내 하나 (START-09). 문구는 화면이 I18N 사전에서 꺼낸다. */
export function pickNotice(state: NoticeState): NoticeLine | null {
  if (state.saveFailed)
    return line(['notice.saveFailed']);
  if (state.fileProblem === 'newerFile')
    return newerFileLine(state.update);
  if (state.fileProblem === 'backup')
    return line(['notice.backup']);
  if (state.autoStartFailed)
    return line(['notice.autoStartFailed']);
  switch (state.update) {
    case 'available':
      return line(['update.available'], true);
    case 'installing':
      return line(['update.installing']);
    case 'failed':
      return line(['update.failed'], true);
    case 'none':
      return null;
  }
}

/** 업데이트하라고 알리면서 누를 것이 없으면 안 되므로 버튼을 함께 보인다 (START-09, UPD-03, UPD-04, UPD-07). */
function newerFileLine(update: UpdateNoticeState): NoticeLine {
  switch (update) {
    case 'installing':
      return line(['update.installing']);
    case 'failed':
      return line(['notice.newerFile', 'update.failed'], true);
    case 'available':
      return line(['notice.newerFile'], true);
    case 'none':
      return line(['notice.newerFile']);
  }
}

function line(messages: NoticeKey[], action = false): NoticeLine {
  return { messages, action };
}
```

`src/application/todo-session.ts`:

```ts
import type { Clock } from '../domain/clock.ts';
import type { IdGenerator } from '../domain/ids.ts';
import type { TodoItem } from '../domain/todo-item.ts';
import { TodoList } from '../domain/todo-list.ts';
import type { TodoStatus } from '../domain/todo-status.ts';
import { FileAccessError } from './ports/file-store.ts';
import type { TaskLoadMode, TaskRepository } from './storage/task-repository.ts';

type Listener = () => void;

/**
 * 할 일 목록과 그 저장. 바뀔 때마다 바로 저장하고(STORE-01), 실패하면 다음 변경 때 다시 저장한다(STORE-11).
 * 저장은 하나씩 차례로 하고, 늘 그 순간의 전체 목록을 쓴다.
 */
export class TodoSession {
  readonly #list: TodoList;
  readonly #repo: TaskRepository;
  readonly #fileNotice: 'backup' | 'newerFile' | null;
  readonly #listeners = new Set<Listener>();
  #mode: TaskLoadMode;
  #saveFailed: boolean;
  #queue: Promise<void> = Promise.resolve();

  private constructor(list: TodoList, repo: TaskRepository, mode: TaskLoadMode, fileNotice: 'backup' | 'newerFile' | null, saveFailed: boolean) {
    this.#list = list;
    this.#repo = repo;
    this.#mode = mode;
    this.#fileNotice = fileNotice;
    this.#saveFailed = saveFailed;
  }

  /** 읽지 못하면 CannotOpenError를 그대로 던진다 (STORE-10). */
  static async open(repo: TaskRepository, clock: Clock, newId: IdGenerator): Promise<TodoSession> {
    const load = await repo.load();
    return new TodoSession(new TodoList(clock, newId, load.items), repo, load.mode, load.notice, load.saveFailed);
  }

  get items(): readonly TodoItem[] {
    return this.#list.items;
  }

  todoSection(): TodoItem[] {
    return this.#list.todoSection();
  }

  doneSection(): TodoItem[] {
    return this.#list.doneSection();
  }

  get remainingCount(): number {
    return this.#list.remainingCount;
  }

  /** 할 일 저장 실패 안내 (STORE-11, STORE-13). */
  get saveFailed(): boolean {
    return this.#saveFailed;
  }

  /** 다시 켤 때까지 남는 파일 안내 (STORE-08, STORE-14). */
  get fileNotice(): 'backup' | 'newerFile' | null {
    return this.#fileNotice;
  }

  onChange(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** 입력칸의 한 줄이나 붙여 넣은 여러 줄. 여러 개를 추가해도 저장은 한 번이다 (STORE-01). */
  add(text: string): Promise<boolean> {
    return this.#commit(this.#list.addLines(text) > 0);
  }

  cycle(id: string): Promise<boolean> {
    return this.#commit(this.#list.cycle(id));
  }

  setStatus(id: string, status: TodoStatus): Promise<boolean> {
    return this.#commit(this.#list.setStatus(id, status));
  }

  rename(id: string, title: string): Promise<boolean> {
    return this.#commit(this.#list.rename(id, title));
  }

  remove(id: string): Promise<boolean> {
    return this.#commit(this.#list.remove(id));
  }

  clear(): Promise<boolean> {
    return this.#commit(this.#list.clear());
  }

  async #commit(changed: boolean): Promise<boolean> {
    if (!changed)
      return false;
    this.#notify();
    this.#queue = this.#queue.catch(() => undefined).then(() => this.#persist());
    await this.#queue;
    return true;
  }

  async #persist(): Promise<void> {
    if (this.#mode === 'readOnly')
      return;
    try {
      if (this.#mode === 'pendingConversion') {
        await this.#repo.convert(this.#list.items);
        this.#mode = 'normal';
      } else {
        await this.#repo.save(this.#list.items);
      }
      this.#setSaveFailed(false);
    } catch (error) {
      if (!(error instanceof FileAccessError))
        throw error;
      this.#setSaveFailed(true);
    }
  }

  #setSaveFailed(value: boolean): void {
    if (this.#saveFailed === value)
      return;
    this.#saveFailed = value;
    this.#notify();
  }

  #notify(): void {
    for (const listener of this.#listeners)
      listener();
  }
}
```

- [ ] **Step 3: 통과 확인과 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`

```bash
git add -A
git commit -m "feat: 할 일 세션(바로 저장, 실패 다시 시도, v1 변환 다시 시도)과 안내 줄 우선순위 추가"
```

---

### Task 13: 시작 흐름과 자동 실행 메뉴

**Files:**
- Create: `src/application/ports/auto-start.ts`, `src/application/ports/app-info.ts`, `src/application/startup.ts`, `src/application/auto-start-control.ts`, `src/application/data-dir.ts`, `src/testing/fake-auto-start.ts`
- Test: `src/application/startup.test.ts`, `src/application/auto-start-control.test.ts`, `src/application/data-dir.test.ts`

**Interfaces:**
- Consumes: `TodoSession` (Task 12), `TaskRepository`, `CannotOpenError` (Task 10), `SettingsRepository`, `SettingsService`, `SETTINGS_FILE` (Task 11)
- Produces:
  - `interface AutoStart { isEnabled(): Promise<boolean>; enable(): Promise<void>; disable(): Promise<void>; refresh(): Promise<void> }` — 실패하면 던진다. `refresh`는 등록이 남아 있으면 지금 실행 파일로 갱신하고 꺼진 상태는 바꾸지 않는다(OS별 방법은 WIN-03, MAC-08, 계획 4).
  - `interface AppInfo { readonly version: string; readonly isDevBuild: boolean }`
  - `interface StartupDeps { files: FileStore; clock: Clock; newId: IdGenerator; autoStart: AutoStart; appInfo: AppInfo }`
  - `type StartupResult = { kind: 'cannotOpen'; path: string; detail: string } | { kind: 'ready'; session: TodoSession; settings: SettingsService }`
  - `startApp(deps: StartupDeps): Promise<StartupResult>`
  - `class AutoStartControl` — `constructor(autoStart: AutoStart)`, `get failed(): boolean`, `onChange(listener): () => void`, `isEnabled(): Promise<boolean>`, `toggle(): Promise<boolean>`
  - `resolveDataDir(envValue: string | null | undefined, osDefault: string): string`
  - 테스트용 `class FakeAutoStart implements AutoStart` — `enabled`, `failEnable`, `failDisable`, `failRefresh`, `calls: string[]`

- [ ] **Step 1: port와 가짜 작성**

`src/application/ports/auto-start.ts`:

```ts
/** OS 자동 실행 등록. 등록 여부가 기준이고 파일에 저장하지 않는다 (startup.md 용어). 실패하면 던진다. */
export interface AutoStart {
  /** OS가 실제로 허용한 상태 (WIN-03, MAC-08). */
  isEnabled(): Promise<boolean>;
  /** 지금 실행 파일로 등록해 켠다. */
  enable(): Promise<void>;
  /** 등록을 지워 끈다. 이미 꺼져 있어도 오류가 아니다 (START-04). */
  disable(): Promise<void>;
  /** 등록이 남아 있으면 지금 실행 파일로 갱신한다. 꺼진 상태는 바꾸지 않는다 (START-03). */
  refresh(): Promise<void>;
}
```

`src/application/ports/app-info.ts`:

```ts
export interface AppInfo {
  /** 지금 실행 중인 버전. 예: `2.0.0` (update.md "새 버전"). */
  readonly version: string;
  /** 개발용 빌드면 자동 실행을 건드리지 않는다 (START-07). */
  readonly isDevBuild: boolean;
}
```

`src/testing/fake-auto-start.ts`:

```ts
import type { AutoStart } from '../application/ports/auto-start.ts';

/** 테스트용 자동 실행 등록. */
export class FakeAutoStart implements AutoStart {
  enabled = false;
  failEnable = false;
  failDisable = false;
  failRefresh = false;
  readonly calls: string[] = [];

  async isEnabled(): Promise<boolean> {
    return this.enabled;
  }

  async enable(): Promise<void> {
    this.calls.push('enable');
    if (this.failEnable)
      throw new Error('OS가 등록을 거부했어요');
    this.enabled = true;
  }

  async disable(): Promise<void> {
    this.calls.push('disable');
    if (this.failDisable)
      throw new Error('OS가 해제를 거부했어요');
    this.enabled = false;
  }

  async refresh(): Promise<void> {
    this.calls.push('refresh');
    if (this.failRefresh)
      throw new Error('경로를 갱신하지 못했어요');
  }
}
```

- [ ] **Step 2: 실패하는 테스트**

`src/application/startup.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeAutoStart } from '../testing/fake-auto-start.ts';
import { FakeClock } from '../testing/fake-clock.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { sequenceIds } from '../testing/sequence-ids.ts';
import { SETTINGS_FILE } from './settings/settings-repository.ts';
import { TASKS_FILE } from './storage/task-repository.ts';
import { type StartupResult, startApp } from './startup.ts';

let files: MemoryFileStore;
let autoStart: FakeAutoStart;

beforeEach(() => {
  files = new MemoryFileStore();
  autoStart = new FakeAutoStart();
});

function start(isDevBuild = false): Promise<StartupResult> {
  return startApp({ files, clock: new FakeClock(), newId: sequenceIds(), autoStart, appInfo: { version: '2.0.0', isDevBuild } });
}

describe('시작', () => {
  it('START-02 settings.json이 없으면 처음 실행이라 자동 실행을 켜고 기본 설정 파일을 만든다', async () => {
    const result = await start();
    expect(result.kind).toBe('ready');
    expect(autoStart.calls).toEqual(['enable']);
    expect(JSON.parse(files.files.get(SETTINGS_FILE) ?? '')).toMatchObject({ pinned: true, doneExpanded: false, todoExpanded: true });
  });

  it('START-03 처음 실행이 아니면 켜지 않고 등록 경로만 갱신한다', async () => {
    files.files.set(SETTINGS_FILE, '{"pinned": false}');
    await start();
    expect(autoStart.calls).toEqual(['refresh']);
    expect(files.writes).toEqual([]);
  });

  it('START-06 자동 실행 등록이나 첫 설정 저장이 실패해도 위젯은 뜬다', async () => {
    autoStart.failEnable = true;
    files.failWrites = true;
    const result = await start();
    expect(result.kind).toBe('ready');

    files.files.set(SETTINGS_FILE, '{}');
    autoStart.failRefresh = true;
    expect((await start()).kind).toBe('ready');
  });

  it('START-07 개발 빌드는 자동 실행을 건드리지 않지만 첫 설정 파일은 만든다', async () => {
    await start(true);
    expect(autoStart.calls).toEqual([]);
    expect(files.files.has(SETTINGS_FILE)).toBe(true);
  });

  it('STORE-10 tasks.json을 읽지 못하면 위젯을 띄우지 않고, 자동 실행과 첫 설정 파일도 건드리지 않는다', async () => {
    files.files.set(TASKS_FILE, '{"version":2,"tasks":[]}');
    files.unreadable.add(TASKS_FILE);
    const result = await start();
    expect(result).toEqual({ kind: 'cannotOpen', path: '/data/tasks.json', detail: expect.stringContaining('읽지 못했어요') });
    expect(autoStart.calls).toEqual([]);
    expect(files.files.has(SETTINGS_FILE)).toBe(false);
  });

  it('준비되면 할 일 세션과 설정을 돌려준다', async () => {
    files.files.set(SETTINGS_FILE, '{"pinned": false}');
    const result = await start();
    if (result.kind !== 'ready')
      throw new Error('준비되지 않았어요');
    expect(result.settings.current.pinned).toBe(false);
    expect(result.session.items).toEqual([]);
  });
});
```

`src/application/auto-start-control.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeAutoStart } from '../testing/fake-auto-start.ts';
import { AutoStartControl } from './auto-start-control.ts';

let autoStart: FakeAutoStart;
let control: AutoStartControl;

beforeEach(() => {
  autoStart = new FakeAutoStart();
  control = new AutoStartControl(autoStart);
});

describe('⋯ 메뉴의 자동 실행', () => {
  it('START-04 체크 표시는 실제 등록 상태이고, 누르면 켜고 끈 뒤 다시 읽은 상태를 돌려준다', async () => {
    expect(await control.isEnabled()).toBe(false);
    expect(await control.toggle()).toBe(true);
    expect(autoStart.enabled).toBe(true);
    expect(await control.toggle()).toBe(false);
    expect(autoStart.calls).toEqual(['enable', 'disable']);
  });

  it('START-04 등록 여부를 읽지 못하면 꺼짐으로 보인다', async () => {
    autoStart.isEnabled = async () => {
      throw new Error('읽지 못함');
    };
    expect(await control.isEnabled()).toBe(false);
  });

  it('START-05 OS가 거부하면 안내를 켜고 실제 상태를 돌려주며, 다시 바꾸는 데 성공하면 안내를 끈다', async () => {
    let changes = 0;
    control.onChange(() => changes++);
    autoStart.failEnable = true;
    expect(await control.toggle()).toBe(false);
    expect(control.failed).toBe(true);

    autoStart.failEnable = false;
    expect(await control.toggle()).toBe(true);
    expect(control.failed).toBe(false);
    expect(changes).toBe(2);
  });
});
```

`src/application/data-dir.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveDataDir } from './data-dir.ts';

describe('데이터 폴더', () => {
  it('STORE-18 TODOWIDGET_DATA_DIR 값이 있으면 그 폴더, 없거나 빈 문자열이면 OS 기본 폴더다', () => {
    expect(resolveDataDir('/tmp/dev-data', '/Users/me/Library/Application Support/TodoWidget')).toBe('/tmp/dev-data');
    expect(resolveDataDir('', '/기본')).toBe('/기본');
    expect(resolveDataDir(undefined, '/기본')).toBe('/기본');
    expect(resolveDataDir(null, '/기본')).toBe('/기본');
  });
});
```

Run: `pnpm vitest run src/application/startup.test.ts src/application/auto-start-control.test.ts src/application/data-dir.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`src/application/startup.ts`:

```ts
import type { Clock } from '../domain/clock.ts';
import type { IdGenerator } from '../domain/ids.ts';
import type { AppInfo } from './ports/app-info.ts';
import type { AutoStart } from './ports/auto-start.ts';
import type { FileStore } from './ports/file-store.ts';
import { SettingsRepository } from './settings/settings-repository.ts';
import { SettingsService } from './settings/settings-service.ts';
import { CannotOpenError, TaskRepository } from './storage/task-repository.ts';
import { TodoSession } from './todo-session.ts';

export interface StartupDeps {
  files: FileStore;
  clock: Clock;
  newId: IdGenerator;
  autoStart: AutoStart;
  appInfo: AppInfo;
}

export type StartupResult =
  | { kind: 'cannotOpen'; path: string; detail: string }
  | { kind: 'ready'; session: TodoSession; settings: SettingsService };

/**
 * 할 일을 먼저 읽는다. 읽지 못하면 자동 실행과 첫 설정 파일을 건드리지 않고 멈춘다(STORE-10).
 * 그다음 자동 실행(START-02, START-03, START-07)과 첫 설정 파일(START-02). 이 둘의 실패는 조용히 넘어간다(START-06).
 */
export async function startApp(deps: StartupDeps): Promise<StartupResult> {
  const settingsRepo = new SettingsRepository(deps.files);
  const firstRun = !(await settingsRepo.exists());

  let session: TodoSession;
  try {
    session = await TodoSession.open(new TaskRepository(deps.files, deps.clock), deps.clock, deps.newId);
  } catch (error) {
    if (error instanceof CannotOpenError)
      return { kind: 'cannotOpen', path: error.path, detail: error.detail };
    throw error;
  }

  if (!deps.appInfo.isDevBuild)
    await quietly(() => (firstRun ? deps.autoStart.enable() : deps.autoStart.refresh()));

  const settings = await SettingsService.open(settingsRepo);
  if (firstRun)
    await settings.save();

  return { kind: 'ready', session, settings };
}

async function quietly(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch {
    // START-06: 자동 실행이 실패해도 위젯은 뜬다.
  }
}
```

`src/application/auto-start-control.ts`:

```ts
import type { AutoStart } from './ports/auto-start.ts';

type Listener = () => void;

/** ⋯ 메뉴의 "컴퓨터 켤 때 자동 실행" (START-04, START-05). */
export class AutoStartControl {
  readonly #autoStart: AutoStart;
  readonly #listeners = new Set<Listener>();
  #failed = false;

  constructor(autoStart: AutoStart) {
    this.#autoStart = autoStart;
  }

  /** 자동 실행 실패 안내. 다시 바꾸는 데 성공하면 꺼진다(다시 켜면 새 객체라 꺼져 있다). */
  get failed(): boolean {
    return this.#failed;
  }

  onChange(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** 메뉴를 열 때마다 읽는다. 읽지 못하면 꺼짐으로 보인다. */
  async isEnabled(): Promise<boolean> {
    try {
      return await this.#autoStart.isEnabled();
    } catch {
      return false;
    }
  }

  /** 켜져 있으면 끄고 꺼져 있으면 켠 뒤, 다시 읽은 실제 상태를 돌려준다. */
  async toggle(): Promise<boolean> {
    const wasEnabled = await this.isEnabled();
    try {
      if (wasEnabled)
        await this.#autoStart.disable();
      else
        await this.#autoStart.enable();
      this.#setFailed(false);
    } catch {
      this.#setFailed(true);
    }
    return this.isEnabled();
  }

  #setFailed(value: boolean): void {
    if (this.#failed === value)
      return;
    this.#failed = value;
    for (const listener of this.#listeners)
      listener();
  }
}
```

`src/application/data-dir.ts`:

```ts
/** 개발 중에는 환경 변수 TODOWIDGET_DATA_DIR로 데이터 폴더를 바꾼다. 없거나 빈 문자열이면 OS 기본 폴더 (STORE-18). */
export function resolveDataDir(envValue: string | null | undefined, osDefault: string): string {
  return envValue ? envValue : osDefault;
}
```

- [ ] **Step 4: 통과 확인과 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`

```bash
git add -A
git commit -m "feat: 시작 흐름(자동 실행, 첫 설정, 열 수 없는 파일)과 자동 실행 메뉴 추가"
```

---

### Task 14: 업데이트 확인 일정과 설치 흐름

**Files:**
- Create: `src/application/ports/updater.ts`, `src/application/ports/timer.ts`, `src/application/update-service.ts`, `src/testing/fake-updater.ts`, `src/testing/fake-timer.ts`
- Test: `src/application/update-service.test.ts`

**Interfaces:**
- Consumes: `SettingsService`, `SettingsRepository` (Task 11), `isNewerVersion` (Task 8), `AppInfo` (Task 13), `FakeClock` (Task 2), `MemoryFileStore` (Task 10), `UpdateNoticeState` (Task 12)
- Produces:
  - `interface Updater { fetchLatest(): Promise<{ version: string }>; downloadAndInstall(): Promise<void> }` — 둘 다 실패하면 던진다. 서명이 맞지 않으면 `downloadAndInstall`이 던진다(UPD-08, 계획 4 adapter).
  - `interface Timer { schedule(ms: number, task: () => void): () => void }` (취소 함수를 돌려준다)
  - `CHECK_INTERVAL_MS = 86_400_000`, `RETRY_INTERVAL_MS = 3_600_000`
  - `interface UpdateDeps { updater: Updater; clock: Clock; timer: Timer; appInfo: AppInfo; settings: SettingsService; prepareRestart: () => Promise<void> }`
  - `class UpdateService` — `constructor(deps: UpdateDeps)`, `get state(): UpdateNoticeState`, `onChange(listener): () => void`, `start(): Promise<void>`, `check(): Promise<void>`, `onWake(): Promise<void>`, `install(): Promise<void>`, `dispose(): void`
  - 테스트용 `FakeUpdater`(`latest`, `failFetch`, `failInstall`, `fetches`, `installs`, `installGate`), `FakeTimer`(`constructor(clock: FakeClock)`, `schedule`, `advance(ms): Promise<void>`)

- [ ] **Step 1: port와 가짜 작성**

`src/application/ports/updater.ts`:

```ts
/** GitHub Release의 latest.json과 업데이트 파일 (UPD-02, UPD-08). 실제 구현은 계획 4의 updater adapter. */
export interface Updater {
  /** latest.json을 읽어 그 버전을 돌려준다. 인터넷 없음·서버 오류·형식 오류면 던진다 (UPD-06). */
  fetchLatest(): Promise<{ version: string }>;
  /** 받아서 서명을 확인하고 설치한 뒤 다시 띄운다. 받기·설치 실패나 서명 불일치면 던진다 (UPD-07, UPD-08). */
  downloadAndInstall(): Promise<void>;
}
```

`src/application/ports/timer.ts`:

```ts
/** 나중에 한 번 실행한다. 돌려준 함수를 부르면 취소된다. */
export interface Timer {
  schedule(ms: number, task: () => void): () => void;
}
```

`src/testing/fake-updater.ts`:

```ts
import type { Updater } from '../application/ports/updater.ts';

/** 테스트용 업데이트 서버. `installGate`를 주면 그 약속이 끝날 때까지 설치가 멈춰 있다. */
export class FakeUpdater implements Updater {
  latest = '2.1.0';
  failFetch = false;
  failInstall: Error | null = null;
  installGate: Promise<void> | null = null;
  fetches = 0;
  installs = 0;

  async fetchLatest(): Promise<{ version: string }> {
    this.fetches++;
    if (this.failFetch)
      throw new Error('인터넷이 없어요');
    return { version: this.latest };
  }

  async downloadAndInstall(): Promise<void> {
    this.installs++;
    if (this.installGate)
      await this.installGate;
    if (this.failInstall)
      throw this.failInstall;
  }
}
```

`src/testing/fake-timer.ts`:

```ts
import type { Timer } from '../application/ports/timer.ts';
import type { FakeClock } from './fake-clock.ts';

interface Entry {
  at: number;
  task: () => void;
  cancelled: boolean;
}

/** 테스트용 타이머. advance가 시계를 옮기며 때가 된 일을 실행하고, 그 일이 만든 비동기 작업까지 기다린다. */
export class FakeTimer implements Timer {
  readonly #clock: FakeClock;
  #entries: Entry[] = [];

  constructor(clock: FakeClock) {
    this.#clock = clock;
  }

  schedule(ms: number, task: () => void): () => void {
    const entry: Entry = { at: this.#clock.now().toEpochMs() + ms, task, cancelled: false };
    this.#entries.push(entry);
    return () => {
      entry.cancelled = true;
    };
  }

  async advance(ms: number): Promise<void> {
    const target = this.#clock.now().toEpochMs() + ms;
    for (;;) {
      const due = this.#entries.filter((e) => !e.cancelled && e.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due)
        break;
      this.#entries = this.#entries.filter((e) => e !== due);
      this.#clock.setEpochMs(due.at);
      due.task();
      await flush();
    }
    this.#clock.setEpochMs(target);
  }
}

/** 이미 시작된 비동기 작업이 끝나도록 이벤트 루프를 몇 번 돌린다. */
export async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++)
    await new Promise((resolve) => setTimeout(resolve, 0));
}
```

- [ ] **Step 2: 실패하는 테스트**

`src/application/update-service.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeClock, ts } from '../testing/fake-clock.ts';
import { FakeTimer, flush } from '../testing/fake-timer.ts';
import { FakeUpdater } from '../testing/fake-updater.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { SETTINGS_FILE, SettingsRepository } from './settings/settings-repository.ts';
import { SettingsService } from './settings/settings-service.ts';
import { UpdateService } from './update-service.ts';

const HOUR = 60 * 60 * 1000;

let clock: FakeClock;
let timer: FakeTimer;
let updater: FakeUpdater;
let files: MemoryFileStore;
let settings: SettingsService;
let restarts: string[];

async function makeService(lastUpdateCheck: string | null = null): Promise<UpdateService> {
  if (lastUpdateCheck)
    files.files.set(SETTINGS_FILE, JSON.stringify({ lastUpdateCheck }));
  settings = await SettingsService.open(new SettingsRepository(files));
  return new UpdateService({
    updater,
    clock,
    timer,
    appInfo: { version: '2.0.0', isDevBuild: false },
    settings,
    prepareRestart: async () => {
      restarts.push(`prepare(installs=${updater.installs})`);
    },
  });
}

beforeEach(() => {
  clock = new FakeClock('2026-10-03T09:00:00+09:00');
  timer = new FakeTimer(clock);
  updater = new FakeUpdater();
  files = new MemoryFileStore();
  restarts = [];
});

describe('확인 일정', () => {
  it('UPD-01 켤 때 lastUpdateCheck와 관계없이 확인하고, 성공하면 그 시각을 저장하고 24시간 뒤 다시 확인한다', async () => {
    const service = await makeService('2026-10-03T08:00:00+09:00');
    await service.start();
    expect(updater.fetches).toBe(1);
    expect(settings.current.lastUpdateCheck?.format()).toBe('2026-10-03T09:00:00+09:00');
    expect(JSON.parse(files.files.get(SETTINGS_FILE) ?? '').lastUpdateCheck).toBe('2026-10-03T09:00:00+09:00');
    await timer.advance(23 * HOUR);
    expect(updater.fetches).toBe(1);
    await timer.advance(HOUR);
    expect(updater.fetches).toBe(2);
  });

  it('UPD-01 확인에 실패하면 lastUpdateCheck를 바꾸지 않고 1시간 뒤 다시 확인한다', async () => {
    updater.failFetch = true;
    const service = await makeService();
    await service.start();
    expect(settings.current.lastUpdateCheck).toBeNull();
    await timer.advance(59 * 60 * 1000);
    expect(updater.fetches).toBe(1);
    updater.failFetch = false;
    await timer.advance(60 * 1000);
    expect(updater.fetches).toBe(2);
    expect(settings.current.lastUpdateCheck?.format()).toBe('2026-10-03T10:00:00+09:00');
  });

  it('UPD-01 잠자기에서 깨어나면 24시간이 지났거나 기록이 없을 때만 바로 확인한다', async () => {
    const recent = await makeService('2026-10-03T08:00:00+09:00');
    await recent.onWake();
    expect(updater.fetches).toBe(0);

    const old = await makeService('2026-10-02T08:00:00+09:00');
    await old.onWake();
    expect(updater.fetches).toBe(1);

    files.files.clear();
    const never = await makeService();
    await never.onWake();
    expect(updater.fetches).toBe(2);
  });
});

describe('안내', () => {
  it('UPD-03 새 버전이 있을 때만 알리고, 나중에 확인했는데 없으면 안내를 지운다', async () => {
    const service = await makeService();
    await service.start();
    expect(service.state).toBe('available');

    updater.latest = '2.0.0';
    await service.check();
    expect(service.state).toBe('none');

    updater.latest = '1.9.0';
    await service.check();
    expect(service.state).toBe('none');
  });

  it('UPD-05 누르지 않으면 받거나 설치하지 않는다', async () => {
    const service = await makeService();
    await service.start();
    await timer.advance(48 * HOUR);
    expect(updater.installs).toBe(0);
    expect(service.state).toBe('available');
  });

  it('UPD-06 확인에 실패해도 앞서 보이던 안내는 그대로 둔다', async () => {
    const service = await makeService();
    await service.start();
    updater.failFetch = true;
    await service.check();
    expect(service.state).toBe('available');
  });
});

describe('설치', () => {
  it('UPD-04 누르면 설정을 저장한 뒤 받아서 설치하고, 설치하는 동안은 다시 누를 수 없다', async () => {
    const service = await makeService();
    await service.start();
    let open = (): void => undefined;
    updater.installGate = new Promise<void>((resolve) => {
      open = resolve;
    });

    const installing = service.install();
    await flush();
    expect(service.state).toBe('installing');
    await service.install();
    expect(updater.installs).toBe(1);
    expect(restarts).toEqual(['prepare(installs=0)']);

    open();
    await installing;
  });

  it('UPD-07 받기나 설치에 실패하면 다시 시도할 수 있게 실패를 알리고, 다시 누르면 바로 다시 설치한다', async () => {
    const service = await makeService();
    await service.start();
    updater.failInstall = new Error('다운로드 실패');
    await service.install();
    expect(service.state).toBe('failed');

    updater.failInstall = null;
    await service.install();
    expect(updater.installs).toBe(2);
  });

  it('UPD-07 실패 안내는 다음에 확인에 성공할 때 새 버전이 있으면 새 버전 안내로, 없으면 사라진다', async () => {
    const service = await makeService();
    await service.start();
    updater.failInstall = new Error('설치 실패');
    await service.install();
    await service.check();
    expect(service.state).toBe('available');

    await service.install();
    updater.latest = '2.0.0';
    await service.check();
    expect(service.state).toBe('none');
  });

  it('UPD-08 서명이 맞지 않아 설치하지 못하면 UPD-07과 같이 실패로 알린다', async () => {
    const service = await makeService();
    await service.start();
    updater.failInstall = new Error('서명이 맞지 않아요');
    await service.install();
    expect(service.state).toBe('failed');
  });

  it('새 버전이 없으면 눌러도 아무것도 하지 않는다', async () => {
    updater.latest = '2.0.0';
    const service = await makeService();
    await service.start();
    await service.install();
    expect(updater.installs).toBe(0);
  });
});

describe('알림과 정리', () => {
  it('상태가 바뀌면 알리고, dispose하면 예약된 확인을 취소한다', async () => {
    const service = await makeService();
    const states: string[] = [];
    service.onChange(() => states.push(service.state));
    await service.start();
    expect(states).toEqual(['available']);
    service.dispose();
    await timer.advance(25 * HOUR);
    expect(updater.fetches).toBe(1);
    expect(ts('2026-10-03T09:00:00+09:00').compare(settings.current.lastUpdateCheck ?? ts('2000-01-01T00:00:00+00:00'))).toBe(0);
  });
});
```

Run: `pnpm vitest run src/application/update-service.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`src/application/update-service.ts`:

```ts
import type { Clock } from '../domain/clock.ts';
import { isNewerVersion } from '../domain/version.ts';
import type { UpdateNoticeState } from './notices.ts';
import type { AppInfo } from './ports/app-info.ts';
import type { Timer } from './ports/timer.ts';
import type { Updater } from './ports/updater.ts';
import type { SettingsService } from './settings/settings-service.ts';

export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const RETRY_INTERVAL_MS = 60 * 60 * 1000;

export interface UpdateDeps {
  updater: Updater;
  clock: Clock;
  timer: Timer;
  appInfo: AppInfo;
  settings: SettingsService;
  /** 다시 띄우기 전에 종료할 때처럼 설정을 저장한다 (UPD-04, WND-14). */
  prepareRestart: () => Promise<void>;
}

type Listener = () => void;

/** 켤 때와 하루 한 번 새 버전을 확인하고(UPD-01), 누르면 설치한다(UPD-04). 사용자가 누르기 전에는 받지 않는다(UPD-05). */
export class UpdateService {
  readonly #deps: UpdateDeps;
  readonly #listeners = new Set<Listener>();
  #state: UpdateNoticeState = 'none';
  #cancelScheduled: (() => void) | null = null;

  constructor(deps: UpdateDeps) {
    this.#deps = deps;
  }

  get state(): UpdateNoticeState {
    return this.#state;
  }

  onChange(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** 켤 때는 lastUpdateCheck와 관계없이 확인한다 (UPD-01). */
  start(): Promise<void> {
    return this.check();
  }

  /** 성공하면 확인한 시각을 저장하고 24시간 뒤, 실패하면 1시간 뒤 다시 확인한다 (UPD-01, UPD-06). */
  async check(): Promise<void> {
    this.#cancel();
    let latest: { version: string };
    try {
      latest = await this.#deps.updater.fetchLatest();
    } catch {
      this.#schedule(RETRY_INTERVAL_MS);
      return;
    }
    await this.#deps.settings.update({ lastUpdateCheck: this.#deps.clock.now() });
    if (this.#state !== 'installing')
      this.#setState(isNewerVersion(latest.version, this.#deps.appInfo.version) ? 'available' : 'none');
    this.#schedule(CHECK_INTERVAL_MS);
  }

  /** 잠자기에서 깨어나면 24시간이 지났거나 기록이 없을 때 바로 확인한다 (UPD-01). */
  async onWake(): Promise<void> {
    const last = this.#deps.settings.current.lastUpdateCheck;
    const elapsed = last ? this.#deps.clock.now().toEpochMs() - last.toEpochMs() : Infinity;
    if (elapsed >= CHECK_INTERVAL_MS)
      await this.check();
  }

  /** 새 버전 안내나 실패 안내에서 누르면 설치한다. 설치하는 동안은 다시 누를 수 없다 (UPD-04, UPD-07, UPD-08). */
  async install(): Promise<void> {
    if (this.#state !== 'available' && this.#state !== 'failed')
      return;
    this.#setState('installing');
    try {
      await this.#deps.prepareRestart();
      await this.#deps.updater.downloadAndInstall();
    } catch {
      this.#setState('failed');
    }
  }

  dispose(): void {
    this.#cancel();
    this.#listeners.clear();
  }

  #schedule(ms: number): void {
    this.#cancelScheduled = this.#deps.timer.schedule(ms, () => {
      void this.check();
    });
  }

  #cancel(): void {
    this.#cancelScheduled?.();
    this.#cancelScheduled = null;
  }

  #setState(state: UpdateNoticeState): void {
    if (this.#state === state)
      return;
    this.#state = state;
    for (const listener of this.#listeners)
      listener();
  }
}
```

- [ ] **Step 4: 통과 확인과 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`

```bash
git add -A
git commit -m "feat: 업데이트 확인 일정(켤 때·하루·실패 1시간·잠자기)과 설치 흐름 추가"
```

---

### Task 15: 설계 문서와 spec 연결 정리

**Files:**
- Modify: `docs/superpowers/specs/2026-10-03-cross-platform-design.md` (5.2 port 표, 5.1 테스트 가짜 위치, 변경 이력)
- Modify: `CLAUDE.md` (문서 지도에 계획 3 행)

- [ ] **Step 1: 설계 문서 5.2 port 표를 실제 코드에 맞춘다**

5.2 표를 다음으로 바꾼다(이름과 위치가 코드와 같아야 한다):

```markdown
| port | 하는 일 | 위치 | 구현 |
|---|---|---|---|
| `Clock` | 지금 시각(PC 시간대 포함) | `src/domain/clock.ts` | `src/adapters/system/clock.ts` / `FakeClock` |
| `IdGenerator` | 할 일 id | `src/domain/ids.ts` | `src/adapters/system/ids.ts` / `sequenceIds` |
| `FileStore` | 데이터 폴더 파일 읽기, 안전한 쓰기, 이름 바꾸기, 복사 | `src/application/ports/file-store.ts` | 계획 4 Rust 명령 / `MemoryFileStore` |
| `AutoStart` | 자동 실행 켜짐 확인, 켜기, 끄기, 등록 경로 갱신 | `src/application/ports/auto-start.ts` | 계획 4 Windows 레지스트리·macOS 로그인 항목 / `FakeAutoStart` |
| `Updater` | latest.json 확인, 받아서 설치 | `src/application/ports/updater.ts` | 계획 4 Tauri updater plugin / `FakeUpdater` |
| `Timer` | 나중에 한 번 실행 | `src/application/ports/timer.ts` | 계획 4 / `FakeTimer` |
| `AppInfo` | 앱 버전, 개발 빌드 여부 | `src/application/ports/app-info.ts` | 계획 4 |
| `WindowController` | 위치, 크기, 맨 위 고정, 앞으로 가져오기, 모니터 영역 | 계획 4에서 `src/application/ports/`로 옮김 | 계획 4 |
| `LocaleProvider` | OS 언어 | 계획 4 | 계획 4 |
| `Dialog` | OS 대화 상자 (STORE-10) | 계획 4·5 (시작 흐름은 `cannotOpen` 결과를 돌려주고, 대화 상자는 composition root가 띄운다) | 계획 4 |
```

5.1 표 아래에 한 줄을 더한다: "테스트용 가짜(port 구현)는 `src/testing/`에 둔다. 제품 코드는 import하지 않는다."
변경 이력: `- 2026-10-03: 계획 3 결과 — port 표를 실제 위치·이름으로 맞추고, 시계와 id 생성기는 domain이 쓰므로 domain에 둔다고 적었다.`

- [ ] **Step 2: CLAUDE.md 문서 지도**

문서 지도 표의 계획 2 행 아래에 더한다:

```markdown
| 계획 3 (할 일 규칙과 앱 흐름) | `docs/superpowers/plans/2026-10-03-v2-domain-and-application.md` |
```

(이 행은 계획 작성 때 이미 들어가 있으면 그대로 둔다.)

- [ ] **Step 3: 최종 검사와 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`
Expected: 통과. spec:check 안내 목록에 "이 계획이 다루는 spec ID" 표의 자동 테스트 ID가 더는 없다(UPD-02, STORE-02, 계획 4·5 몫만 남는다). 남은 목록을 보고서에 적는다.

```bash
git add -A
git commit -m "docs: 계획 3 결과를 설계 문서 port 표와 문서 지도에 반영"
```
