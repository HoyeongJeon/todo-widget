import { describe, expect, it } from 'vitest';
import { pickLanguage } from './language.ts';

describe('화면 언어', () => {
  it('I18N-01 OS 언어의 앞부분으로 고르고, zh는 지역과 관계없이 간체, 그 밖은 영어다', () => {
    const cases: [string, string][] = [
      ['ko-KR', 'ko'],
      ['de-AT', 'de'],
      ['zh-CN', 'zh-Hans'],
      ['zh-TW', 'zh-Hans'],
      ['zh-Hant-HK', 'zh-Hans'],
      ['en-US', 'en'],
      ['fr-FR', 'en'],
      ['ja-JP', 'en'],
    ];
    for (const [locale, language] of cases)
      expect(pickLanguage(locale), locale).toBe(language);
  });

  it('I18N-01 대소문자, 밑줄 구분자, 빈 값도 다룬다', () => {
    expect(pickLanguage('KO')).toBe('ko');
    expect(pickLanguage('de_DE')).toBe('de');
    expect(pickLanguage('')).toBe('en');
    expect(pickLanguage(null)).toBe('en');
  });
});
