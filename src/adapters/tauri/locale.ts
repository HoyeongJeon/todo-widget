import type { LocaleProvider } from '../../application/ports/locale.ts';
import type { Invoke } from './invoke.ts';

/** WebView의 navigator.language는 앱 번들의 지역화에 따라 OS 언어와 다를 수 있어, Rust(sys-locale)가 읽은 값을 쓴다. */
export function createLocaleProvider(invoke: Invoke): LocaleProvider {
  return {
    async osLocale(): Promise<string | null> {
      try {
        const locale = await invoke('os_locale');
        return typeof locale === 'string' && locale.length > 0 ? locale : null;
      } catch {
        return null;
      }
    },
  };
}
