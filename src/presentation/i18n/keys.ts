/** spec/behavior/i18n.md "문구" 표의 키. 순서도 표와 같다 (I18N-03). */
export const MESSAGE_KEYS = [
  'app.title',
  'header.remaining',
  'header.allDone',
  'pin.on',
  'pin.off',
  'menu.more',
  'menu.autoStart',
  'menu.transparency',
  'menu.reset',
  'menu.quit',
  'status.todo',
  'status.doing',
  'status.done',
  'item.changeStatus',
  'item.rename',
  'item.delete',
  'section.doneShow',
  'section.doneHide',
  'input.placeholder',
  'list.empty',
  'reset.question',
  'reset.warning',
  'reset.cancel',
  'reset.confirm',
  'notice.backup',
  'notice.saveFailed',
  'notice.newerFile',
  'notice.autoStartFailed',
  'update.available',
  'update.action',
  'update.installing',
  'update.failed',
  'error.cannotOpen',
  'tray.open',
] as const;

export type MessageKey = (typeof MESSAGE_KEYS)[number];

/** 개수에 따라 형태가 바뀌는 문구. 영어·독일어만 쓰고, 한국어·중국어는 문자열 하나다 (I18N-04). */
export interface PluralText {
  readonly one: string;
  readonly other: string;
}

/** 화면 언어 하나의 사전. 문구 안의 `{n}`은 개수 자리다. */
export type Dictionary = Readonly<Record<MessageKey, string | PluralText>>;
