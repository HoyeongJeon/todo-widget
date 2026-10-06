import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const workflow = read('.github/workflows/release.yml');
const releaseConf = JSON.parse(read('src-tauri/tauri.release.conf.json'));
const baseConf = JSON.parse(read('src-tauri/tauri.conf.json'));

/** `  name:` 같은 job 블록 하나를 다음 job 전까지 잘라 낸다. */
function job(name: string): string {
  const start = workflow.indexOf(`\n  ${name}:\n`);
  expect(start).toBeGreaterThan(-1);
  const rest = workflow.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[\w-]+:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

/** job 블록 안에서 `- name: <name>` step 하나를 다음 step 전까지 잘라 낸다. */
function step(jobText: string, name: string): string {
  const start = jobText.indexOf(`- name: ${name}\n`);
  expect(start).toBeGreaterThan(-1);
  const rest = jobText.slice(start);
  const next = rest.slice(1).search(/\n {6}- /);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

describe('출시 workflow', () => {
  it('REL-03 v로 시작하는 태그를 올리면 돈다', () => {
    expect(workflow).toMatch(/on:\n {2}push:\n {4}tags: \['v\*'\]/);
  });

  it('REL-02 빌드 전에 strict 검사를 하고, 실패하면 빌드하지 않는다', () => {
    expect(job('verify')).toContain('pnpm spec:check:strict');
    expect(job('build')).toContain('needs: verify');
    expect(job('release')).toContain('needs: build');
  });

  it('REL-05 앱 버전과 태그가 같은지 본다', () => {
    expect(job('verify')).toContain('node tools/release/cli.ts versions "$GITHUB_REF_NAME"');
  });

  it('REL-10 출시 빌드는 시험용 업데이트 주소를 쓰지 않는다', () => {
    expect(job('verify')).toContain('test -z "${TODOWIDGET_UPDATE_ENDPOINT:-}"');
    expect(workflow).not.toContain('endpoint-config');
  });

  it('REL-03 Windows NSIS(x64)와 macOS universal을 출시 설정으로 빌드한다', () => {
    const build = job('build');
    expect(build).toContain('--target universal-apple-darwin');
    expect(build).toContain('--bundles nsis');
    expect(build).toContain('--config src-tauri/tauri.release.conf.json');
    expect(build).not.toContain('--features probe');
  });

  it('REL-06 업데이트 서명 키는 GitHub Secrets에서만 받는다', () => {
    expect(job('build')).toContain('TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}');
    expect(job('build')).toContain('TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}');
  });

  it('REL-06 서명 키는 출시 빌드 단계에만 주고 job 전체에는 주지 않는다', () => {
    const build = job('build');
    const stepsAt = build.indexOf('\n    steps:\n');
    expect(stepsAt).toBeGreaterThan(-1);
    expect(build.slice(0, stepsAt)).not.toContain('TAURI_SIGNING_PRIVATE_KEY');
    expect(step(build, '출시 빌드 (REL-03)')).toContain('TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}');
    expect(step(build, '출시 빌드 (REL-03)')).toContain('TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}');
    expect(build.match(/TAURI_SIGNING_PRIVATE_KEY:/g)).toHaveLength(1);
  });

  it('REL-07 이 태그의 릴리스 안내 파일이 없으면 의존성 설치 전에 멈춘다', () => {
    const verify = job('verify');
    const check = 'test -f "docs/release-notes/$GITHUB_REF_NAME.md"';
    expect(step(verify, '릴리스 안내 파일이 있다 (REL-07)')).toContain(check);
    expect(verify.indexOf(check)).toBeLessThan(verify.indexOf('pnpm install'));
  });

  it('REL-02 의존성이 필요 없는 검사(main 위 태그, 시험용 주소, 버전)는 pnpm install 전에 한다', () => {
    const verify = job('verify');
    const install = verify.indexOf('pnpm install');
    expect(install).toBeGreaterThan(-1);
    for (const check of ['git merge-base --is-ancestor', 'test -z "${TODOWIDGET_UPDATE_ENDPOINT:-}"', 'cli.ts versions'])
      expect(verify.indexOf(check)).toBeLessThan(install);
    expect(verify.indexOf('pnpm spec:check:strict')).toBeGreaterThan(install);
  });

  it('PERF-05 초안을 만들기 전에 설치 파일 크기를 본다', () => {
    const release = job('release');
    expect(release.indexOf('cli.ts sizes')).toBeGreaterThan(-1);
    expect(release.indexOf('cli.ts sizes')).toBeLessThan(release.indexOf('gh release create'));
  });

  it('REL-03 latest.json을 만들어 초안(draft)으로 올린다. 공개는 하지 않는다', () => {
    const release = job('release');
    expect(release).toContain('cli.ts latest-json');
    expect(release).toContain('gh release create "$GITHUB_REF_NAME" --draft');
    expect(release).toContain('latest.json');
    expect(workflow).not.toMatch(/--draft=false|gh release edit/);
  });

  it('REL-06 초안을 만들기 전에 latest.json 단계에서 서명 키가 앱의 공개 키와 같은지 본다', () => {
    const release = job('release');
    expect(release).toContain('actions/checkout');
    expect(release.indexOf('cli.ts latest-json')).toBeGreaterThan(-1);
    expect(release.indexOf('cli.ts latest-json')).toBeLessThan(release.indexOf('gh release create'));
  });

  it('REL-03 업데이트 파일 서명은 출시 설정에서만 켠다', () => {
    expect(releaseConf).toEqual({ bundle: { createUpdaterArtifacts: true } });
    expect(baseConf.bundle.createUpdaterArtifacts).toBeUndefined();
  });

  it('REL-03 태그가 main 위에 있을 때만 초안을 만든다', () => {
    expect(job('verify')).toContain('git merge-base --is-ancestor "$GITHUB_SHA" origin/main');
  });
});
