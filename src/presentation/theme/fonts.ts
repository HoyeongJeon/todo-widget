import type { Language } from '../../domain/language.ts';

/** 글꼴이 다른 OS. adapter의 `DesktopOs`와 같은 이름이다. */
export type DesktopPlatform = 'windows' | 'macos';

const FONT_TAGS: Readonly<Record<Language, string>> = { ko: 'ko', en: 'en', de: 'en', 'zh-Hans': 'zh' };

/**
 * 화면 언어와 OS에 맞는 글꼴 (I18N-06, MAC-09, WIN-08). 글꼴 이름은 theme.css 변수에 있고, 여기서는 변수만 고른다.
 * 이 파일은 OS에 따라 다른 값을 고르는 곳이다(설계 문서 5.4의 `src/presentation/theme/`).
 */
export function fontStack(platform: DesktopPlatform, language: Language): string {
  return `var(--font-${platform}-${FONT_TAGS[language]})`;
}
