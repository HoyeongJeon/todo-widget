import { describe, expect, it } from 'vitest';
import { createLocaleProvider } from './locale.ts';

describe('OS 언어', () => {
  it('I18N-01 Rust가 읽은 BCP 47 태그를 그대로 준다', async () => {
    expect(await createLocaleProvider(async () => 'ko-KR').osLocale()).toBe('ko-KR');
  });

  it('I18N-01 알 수 없거나 실패하면 null이다', async () => {
    expect(await createLocaleProvider(async () => null).osLocale()).toBeNull();
    expect(await createLocaleProvider(async () => '').osLocale()).toBeNull();
    expect(
      await createLocaleProvider(async () => {
        throw '실패';
      }).osLocale(),
    ).toBeNull();
  });
});
