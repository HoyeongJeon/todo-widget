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
