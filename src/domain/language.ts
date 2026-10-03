export type Language = 'ko' | 'en' | 'de' | 'zh-Hans';

/** OS 언어 설정의 앞부분으로 화면 언어를 고른다. 켤 때 한 번 정한다 (I18N-01). */
export function pickLanguage(osLocale: string | null): Language {
  const primary = (osLocale ?? '').toLowerCase().split(/[-_]/)[0];
  if (primary === 'ko')
    return 'ko';
  if (primary === 'de')
    return 'de';
  if (primary === 'zh')
    return 'zh-Hans';
  return 'en';
}
