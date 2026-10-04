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

const WINDOWS_CHECKLIST = 'spec/checklists/windows.md';
const MACOS_CHECKLIST = 'spec/checklists/macos.md';
const BOTH_CHECKLISTS = [WINDOWS_CHECKLIST, MACOS_CHECKLIST];

/**
 * spec 파일마다 직접 확인 항목을 올려야 하는 체크리스트.
 * 공통 행동은 두 OS 모두, WIN과 출시(REL, PM이 Windows 체크리스트로 진행)는 Windows, MAC은 macOS에 올린다.
 */
export const CHECKLISTS_BY_FILE: Readonly<Record<string, readonly string[]>> = {
  'spec/00-principles.md': BOTH_CHECKLISTS,
  'spec/behavior/tasks.md': BOTH_CHECKLISTS,
  'spec/behavior/list.md': BOTH_CHECKLISTS,
  'spec/behavior/input.md': BOTH_CHECKLISTS,
  'spec/behavior/window.md': BOTH_CHECKLISTS,
  'spec/behavior/startup.md': BOTH_CHECKLISTS,
  'spec/behavior/storage.md': BOTH_CHECKLISTS,
  'spec/behavior/i18n.md': BOTH_CHECKLISTS,
  'spec/behavior/update.md': BOTH_CHECKLISTS,
  'spec/platform/windows.md': [WINDOWS_CHECKLIST],
  'spec/platform/macos.md': [MACOS_CHECKLIST],
  'spec/release.md': [WINDOWS_CHECKLIST],
};

/**
 * 자동 테스트가 있는 곳. 테스트 이름이나 주석에 요구사항 ID를 적는다.
 * GitHub Actions workflow는 출시·성능 검사 단계 이름에 REL·PERF ID를 적는다.
 * 어떤 줄을 참조로 세는지는 links.ts의 findTestReferences가 정한다.
 */
export const TEST_GLOBS: readonly string[] = [
  'src/**/*.test.ts',
  'src-tauri/src/**/*.rs',
  'src-tauri/crates/*/src/**/*.rs',
  'src-tauri/tests/**/*.rs',
  '.github/workflows/*.yml',
];
