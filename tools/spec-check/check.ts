import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_PREFIXES, CHECKLIST_GLOB, CHECKLISTS_BY_FILE, PREFIXES_BY_FILE, SPEC_GLOB, TEST_GLOBS } from './config.ts';
import { type ChecklistGap, type CoverageReport, checkCoverage } from './coverage.ts';
import { findReferences, findTestReferences } from './links.ts';
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
    files(root, TEST_GLOBS).flatMap((file) => findTestReferences(read(root, file), file, ALL_PREFIXES)),
    [...checklists].flatMap((file) => findReferences(read(root, file), file, ALL_PREFIXES)),
    CHECKLISTS_BY_FILE,
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
    lines.push(`오류 체크리스트에 없는 직접 확인 항목 ${coverage.unlinkedManual.length}개: ${gaps(coverage.unlinkedManual)}`);
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

function ids(requirements: Requirement[]): string {
  return requirements.map((r) => r.id).join(', ');
}

function gaps(list: ChecklistGap[]): string {
  return list.map((g) => `${g.requirement.id}(${g.missing.join(', ')})`).join(', ');
}
