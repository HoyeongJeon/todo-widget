import { type Language, pickLanguage } from '../domain/language.ts';
import type { LocaleProvider } from './ports/locale.ts';

/** 켤 때 한 번 OS 언어로 화면 언어를 정한다. OS 언어를 읽지 못하면 영어다 (I18N-01). */
export async function screenLanguage(locale: LocaleProvider): Promise<Language> {
  try {
    return pickLanguage(await locale.osLocale());
  } catch {
    return pickLanguage(null);
  }
}
