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

  it('REL-03 업데이트 파일 서명은 출시 설정에서만 켠다', () => {
    expect(releaseConf).toEqual({ bundle: { createUpdaterArtifacts: true } });
    expect(baseConf.bundle.createUpdaterArtifacts).toBeUndefined();
  });

  it('REL-03 태그가 main 위에 있을 때만 초안을 만든다', () => {
    expect(job('verify')).toContain('git merge-base --is-ancestor "$GITHUB_SHA" origin/main');
  });
});
