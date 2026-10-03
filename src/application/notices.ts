export type UpdateNoticeState = 'none' | 'available' | 'installing' | 'failed';

export interface NoticeState {
  saveFailed: boolean;
  fileProblem: 'newerFile' | 'backup' | null;
  autoStartFailed: boolean;
  update: UpdateNoticeState;
}

export type NoticeKey =
  | 'notice.saveFailed'
  | 'notice.newerFile'
  | 'notice.backup'
  | 'notice.autoStartFailed'
  | 'update.available'
  | 'update.installing'
  | 'update.failed';

/** 안내 줄 하나. `action`이 true면 그 옆에 `update.action` 버튼을 보인다. */
export interface NoticeLine {
  messages: NoticeKey[];
  action: boolean;
}

/** 우선순위가 가장 높은 안내 하나 (START-09). 문구는 화면이 I18N 사전에서 꺼낸다. */
export function pickNotice(state: NoticeState): NoticeLine | null {
  if (state.saveFailed)
    return line(['notice.saveFailed']);
  if (state.fileProblem === 'newerFile')
    return newerFileLine(state.update);
  if (state.fileProblem === 'backup')
    return line(['notice.backup']);
  if (state.autoStartFailed)
    return line(['notice.autoStartFailed']);
  switch (state.update) {
    case 'available':
      return line(['update.available'], true);
    case 'installing':
      return line(['update.installing']);
    case 'failed':
      return line(['update.failed'], true);
    case 'none':
      return null;
  }
}

/** 업데이트하라고 알리면서 누를 것이 없으면 안 되므로 버튼을 함께 보인다 (START-09, UPD-03, UPD-04, UPD-07). */
function newerFileLine(update: UpdateNoticeState): NoticeLine {
  switch (update) {
    case 'installing':
      return line(['update.installing']);
    case 'failed':
      return line(['notice.newerFile', 'update.failed'], true);
    case 'available':
      return line(['notice.newerFile'], true);
    case 'none':
      return line(['notice.newerFile']);
  }
}

function line(messages: NoticeKey[], action = false): NoticeLine {
  return { messages, action };
}
