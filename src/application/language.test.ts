import { describe, expect, it } from 'vitest';
import { screenLanguage } from './language.ts';
import type { LocaleProvider } from './ports/locale.ts';

function locale(value: string | null): LocaleProvider {
  return { osLocale: async () => value };
}

describe('화면 언어', () => {
  it('I18N-01 켤 때 OS 언어로 화면 언어를 정한다', async () => {
    const tags = ['ko-KR', 'de-AT', 'zh-CN', 'zh-TW', 'zh-Hant-HK', 'en-US', 'fr-FR', 'ja-JP'];
    const languages = await Promise.all(tags.map((tag) => screenLanguage(locale(tag))));
    expect(languages).toEqual(['ko', 'de', 'zh-Hans', 'zh-Hans', 'zh-Hans', 'en', 'en', 'en']);
  });

  it('I18N-01 OS 언어를 알 수 없거나 읽지 못하면 영어다', async () => {
    expect(await screenLanguage(locale(null))).toBe('en');
    const failing: LocaleProvider = {
      osLocale: async () => {
        throw new Error('읽지 못했어요');
      },
    };
    expect(await screenLanguage(failing)).toBe('en');
  });
});
