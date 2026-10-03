import { describe, expect, it } from 'vitest';
import { type NoticeState, pickNotice } from './notices.ts';

const quiet: NoticeState = { saveFailed: false, fileProblem: null, autoStartFailed: false, update: 'none' };
const pick = (patch: Partial<NoticeState>) => pickNotice({ ...quiet, ...patch });

describe('안내 줄', () => {
  it('START-09 알릴 일이 없으면 안내 줄이 없다', () => {
    expect(pick({})).toBeNull();
  });

  it('START-09 할 일 저장 실패 > 파일 문제 > 자동 실행 실패 > 업데이트 순으로 하나만 보인다', () => {
    expect(pick({ saveFailed: true, fileProblem: 'backup', autoStartFailed: true, update: 'available' })).toEqual({
      messages: ['notice.saveFailed'],
      action: false,
    });
    expect(pick({ fileProblem: 'backup', autoStartFailed: true, update: 'available' })).toEqual({ messages: ['notice.backup'], action: false });
    expect(pick({ fileProblem: 'newerFile' })).toEqual({ messages: ['notice.newerFile'], action: false });
    expect(pick({ autoStartFailed: true, update: 'available' })).toEqual({ messages: ['notice.autoStartFailed'], action: false });
  });

  it('START-09 업데이트 안내는 상태마다 문구와 버튼이 다르다', () => {
    expect(pick({ update: 'available' })).toEqual({ messages: ['update.available'], action: true });
    expect(pick({ update: 'installing' })).toEqual({ messages: ['update.installing'], action: false });
    expect(pick({ update: 'failed' })).toEqual({ messages: ['update.failed'], action: true });
  });

  it('START-09 새 버전 파일 안내 옆에는 업데이트 버튼이 함께 보이고, 설치 중과 실패는 그 자리에서 보인다', () => {
    expect(pick({ fileProblem: 'newerFile', update: 'available' })).toEqual({ messages: ['notice.newerFile'], action: true });
    expect(pick({ fileProblem: 'newerFile', update: 'installing' })).toEqual({ messages: ['update.installing'], action: false });
    expect(pick({ fileProblem: 'newerFile', update: 'failed' })).toEqual({ messages: ['notice.newerFile', 'update.failed'], action: true });
  });

  it('START-09 위 안내가 사라지면 다음 안내가 보인다', () => {
    const state: NoticeState = { saveFailed: true, fileProblem: null, autoStartFailed: true, update: 'none' };
    expect(pickNotice(state)?.messages).toEqual(['notice.saveFailed']);
    expect(pickNotice({ ...state, saveFailed: false })?.messages).toEqual(['notice.autoStartFailed']);
  });
});
