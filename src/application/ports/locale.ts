/** OS 언어. BCP 47 태그(예: `ko-KR`, `de-DE`, `zh-Hans-CN`)이고 알 수 없으면 null이다 (I18N-01, 화면 언어는 계획 5). */
export interface LocaleProvider {
  osLocale(): Promise<string | null>;
}
