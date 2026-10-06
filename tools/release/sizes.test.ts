import { describe, expect, it } from 'vitest';
import { checkInstallerSizes, INSTALLER_LIMIT_BYTES } from './sizes.ts';

const MB = 1024 * 1024;

describe('설치 파일 크기', () => {
  it('PERF-05 기준은 15MB다', () => {
    expect(INSTALLER_LIMIT_BYTES).toBe(15 * MB);
  });

  it('PERF-05 dmg와 Windows 설치 파일이 각각 15MB 이하면 문제가 없다. 다른 파일은 보지 않는다', () => {
    expect(checkInstallerSizes([
      { name: 'TodoWidget_2.0.0_universal.dmg', bytes: 9 * MB },
      { name: 'TodoWidget_2.0.0_x64-setup.exe', bytes: 2 * MB },
      { name: 'TodoWidget.app.tar.gz', bytes: 40 * MB },
    ])).toEqual([]);
  });

  it('PERF-05 15MB를 넘으면 실패한다', () => {
    expect(checkInstallerSizes([
      { name: 'TodoWidget_2.0.0_universal.dmg', bytes: 16 * MB },
      { name: 'TodoWidget_2.0.0_x64-setup.exe', bytes: 2 * MB },
    ])).toEqual(['TodoWidget_2.0.0_universal.dmg가 16.0MB예요. 15MB 이하여야 해요 (PERF-05)']);
  });

  it('PERF-05 dmg나 Windows 설치 파일이 없으면 실패한다', () => {
    expect(checkInstallerSizes([{ name: 'TodoWidget_2.0.0_x64-setup.exe', bytes: MB }])).toEqual([
      'macOS dmg가 없어요 (PERF-05)',
    ]);
  });
});
