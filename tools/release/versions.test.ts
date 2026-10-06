import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkVersions, readVersions } from './versions.ts';

const files = (pkg: string, conf: string, cargo: string) => (path: string): string =>
  ({ 'package.json': `{"version":"${pkg}"}`, 'src-tauri/tauri.conf.json': `{"version":"${conf}"}`, 'src-tauri/Cargo.toml': `[package]\nname = "todo-widget"\nversion = "${cargo}"\n\n[dependencies]\nserde = { version = "1" }\n` })[path] ?? '';

describe('출시 버전', () => {
  it('REL-05 package.json, tauri.conf.json, Cargo.toml의 [package] 버전을 읽는다', () => {
    expect(readVersions(files('2.0.0', '2.0.0', '2.0.0'))).toEqual({ packageJson: '2.0.0', tauriConf: '2.0.0', cargoToml: '2.0.0' });
  });

  it('REL-05 세 버전과 태그가 모두 같으면 문제가 없다', () => {
    expect(checkVersions({ packageJson: '2.1.0', tauriConf: '2.1.0', cargoToml: '2.1.0' }, 'v2.1.0')).toEqual([]);
  });

  it('REL-05 하나라도 다르면 실패한다', () => {
    expect(checkVersions({ packageJson: '2.1.0', tauriConf: '2.0.0', cargoToml: '2.1.0' })).toEqual([
      '앱 버전이 서로 달라요: package.json 2.1.0, tauri.conf.json 2.0.0, Cargo.toml 2.1.0 (REL-05)',
    ]);
  });

  it('REL-05 태그가 v와 앱 버전이 아니면 실패한다', () => {
    expect(checkVersions({ packageJson: '2.1.0', tauriConf: '2.1.0', cargoToml: '2.1.0' }, 'v2.1.1')).toEqual([
      '태그 v2.1.1이 앱 버전 2.1.0과 달라요. 태그는 v2.1.0이어야 해요 (REL-05)',
    ]);
  });

  it('REL-05 SemVer(숫자.숫자.숫자)가 아니면 실패한다', () => {
    expect(checkVersions({ packageJson: '2.1', tauriConf: '2.1', cargoToml: '2.1' })).toEqual([
      '앱 버전 2.1은 숫자.숫자.숫자 꼴이어야 해요 (REL-05)',
    ]);
  });

  it('REL-05 이 저장소의 세 버전이 지금 같다', () => {
    const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
    expect(checkVersions(readVersions(read))).toEqual([]);
  });
});
