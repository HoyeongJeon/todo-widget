import { describe, expect, it } from 'vitest';
import { COMPOSITION_ESCAPE_WINDOW_MS, CompositionTracker, isCompositionEscape } from './composition-escape.ts';

const escape = (overrides: Partial<{ key: string; isComposing: boolean; keyCode: number; timeStamp: number }> = {}) => ({
  key: 'Escape',
  isComposing: false,
  keyCode: 27,
  timeStamp: 1000,
  ...overrides,
});

const idle = { composing: false, endedAt: null };

describe('IME 조합을 끝내는 Esc', () => {
  it('INPUT-04 INPUT-15 조합과 관계없는 Esc는 조합용이 아니다', () => {
    expect(isCompositionEscape(escape(), idle)).toBe(false);
    expect(isCompositionEscape(escape({ timeStamp: 5000 }), { composing: false, endedAt: 1000 })).toBe(false);
  });

  it('INPUT-04 INPUT-15 Esc가 아닌 키는 판단하지 않는다', () => {
    expect(isCompositionEscape(escape({ key: 'Enter', keyCode: 13 }), { composing: true, endedAt: null })).toBe(false);
  });

  it('INPUT-04 INPUT-15 브라우저가 조합 중이라고 알리는 Esc(isComposing, keyCode 229)는 조합용이다', () => {
    expect(isCompositionEscape(escape({ isComposing: true }), idle)).toBe(true);
    expect(isCompositionEscape(escape({ keyCode: 229 }), idle)).toBe(true);
  });

  it('INPUT-04 INPUT-15 compositionend 전에 isComposing false·keyCode 27로 온 Esc도 조합용이다', () => {
    expect(isCompositionEscape(escape(), { composing: true, endedAt: null })).toBe(true);
  });

  it('INPUT-04 INPUT-15 compositionend 바로 뒤(WebKit 순서)에 온 Esc는 조합용이다', () => {
    expect(isCompositionEscape(escape({ timeStamp: 1000 }), { composing: false, endedAt: 1000 })).toBe(true);
    expect(isCompositionEscape(escape({ timeStamp: 1000 + COMPOSITION_ESCAPE_WINDOW_MS }), { composing: false, endedAt: 1000 })).toBe(true);
    expect(isCompositionEscape(escape({ timeStamp: 1001 + COMPOSITION_ESCAPE_WINDOW_MS }), { composing: false, endedAt: 1000 })).toBe(false);
  });

  it('INPUT-04 INPUT-15 keydown 시각이 compositionend보다 앞서 찍혀도(WebKit은 OS 키 시각을 쓴다) 조합용이다', () => {
    expect(isCompositionEscape(escape({ timeStamp: 995 }), { composing: false, endedAt: 1000 })).toBe(true);
  });
});

describe('조합 추적', () => {
  it('INPUT-04 INPUT-15 compositionstart부터 compositionend까지 조합 중이고, 끝난 시각을 기억한다', () => {
    const tracker = new CompositionTracker();
    expect(tracker.state).toEqual({ composing: false, endedAt: null });
    tracker.start();
    expect(tracker.state).toEqual({ composing: true, endedAt: null });
    tracker.end(1234);
    expect(tracker.state).toEqual({ composing: false, endedAt: 1234 });
    expect(tracker.isEscape(escape({ timeStamp: 1240 }))).toBe(true);
    expect(tracker.isEscape(escape({ timeStamp: 2000 }))).toBe(false);
  });

  it('INPUT-15 새 칸을 열면(reset) 지난 칸의 조합 상태를 잊는다', () => {
    const tracker = new CompositionTracker();
    tracker.start();
    tracker.reset();
    expect(tracker.state).toEqual({ composing: false, endedAt: null });
  });
});
