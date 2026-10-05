import { describe, expect, it } from 'vitest';
import { loadPlatformInfo } from './app-info.ts';

describe('앱 정보', () => {
  it('START-07 Rust가 알려 준 버전, 개발 빌드 여부, OS를 쓴다', async () => {
    const info = await loadPlatformInfo(async () => ({ version: '2.0.0', isDevBuild: true, os: 'macos' }));
    expect(info).toEqual({ version: '2.0.0', isDevBuild: true, os: 'macos' });
  });

  it('모르는 OS면 던진다', async () => {
    await expect(loadPlatformInfo(async () => ({ version: '2.0.0', isDevBuild: false, os: 'linux' }))).rejects.toThrow();
  });
});
