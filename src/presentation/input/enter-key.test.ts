import { describe, expect, it } from 'vitest';
import { isCommitEnter } from './enter-key.ts';

const key = (overrides: Partial<{ key: string; isComposing: boolean; keyCode: number }> = {}) => ({ key: 'Enter', isComposing: false, keyCode: 13, ...overrides });

describe('추가·저장에 쓰는 Enter', () => {
  it('INPUT-05 INPUT-14 조합 중이 아닌 Enter만 쓴다', () => {
    expect(isCommitEnter(key())).toBe(true);
    expect(isCommitEnter(key({ key: 'a' }))).toBe(false);
  });

  it('INPUT-05 INPUT-14 조합을 확정하는 Enter는 쓰지 않는다', () => {
    expect(isCommitEnter(key({ isComposing: true, keyCode: 229 }))).toBe(false);
    expect(isCommitEnter(key({ isComposing: true }))).toBe(false);
  });

  it('INPUT-05 조합 중이 아니라고 하면서 keyCode가 229인 Enter(Safari 계열)도 확정용이라 쓰지 않는다', () => {
    expect(isCommitEnter(key({ keyCode: 229 }))).toBe(false);
  });
});
