import type { Language } from '../../domain/language.ts';
import { de } from './de.ts';
import { en } from './en.ts';
import type { Dictionary, MessageKey } from './keys.ts';
import { ko } from './ko.ts';
import { zhHans } from './zh-hans.ts';

/** 화면 문구를 꺼낸다. n을 주면 언어별 복수 규칙으로 형태를 고르고 `{n}` 자리에 넣는다 (I18N-02, I18N-04). */
export type Translate = (key: MessageKey, n?: number) => string;

export const DICTIONARIES: Readonly<Record<Language, Dictionary>> = { ko, en, de, 'zh-Hans': zhHans };

/** 켤 때 정한 화면 언어의 번역기. 앱 안에서 언어를 바꾸지 않는다 (I18N-01). */
export function createTranslator(language: Language): Translate {
  const dictionary = DICTIONARIES[language];
  const plural = new Intl.PluralRules(language);
  return (key, n) => {
    const entry = dictionary[key];
    const text = typeof entry === 'string' ? entry : n !== undefined && plural.select(n) === 'one' ? entry.one : entry.other;
    return n === undefined ? text : text.replaceAll('{n}', String(n));
  };
}
