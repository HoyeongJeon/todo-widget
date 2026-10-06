import { describe, expect, it } from 'vitest';
import { CompositionTracker, isCompositionEscape } from './composition-escape.ts';

const escape = (overrides: Partial<{ key: string; isComposing: boolean; keyCode: number }> = {}) => ({
  key: 'Escape',
  isComposing: false,
  keyCode: 27,
  ...overrides,
});

const idle = { composing: false, imeEdited: false };

describe('IME 조합을 끝내는 Esc', () => {
  it('INPUT-04 INPUT-15 조합과 관계없는 Esc는 조합용이 아니다', () => {
    expect(isCompositionEscape(escape(), idle)).toBe(false);
  });

  it('INPUT-04 INPUT-15 Esc가 아닌 키는 판단하지 않는다', () => {
    expect(isCompositionEscape(escape({ key: 'Enter', keyCode: 13 }), { composing: true, imeEdited: true })).toBe(false);
  });

  it('INPUT-04 INPUT-15 브라우저가 조합 중이라고 알리는 Esc(isComposing, keyCode 229)는 조합용이다', () => {
    expect(isCompositionEscape(escape({ isComposing: true }), idle)).toBe(true);
    expect(isCompositionEscape(escape({ keyCode: 229 }), idle)).toBe(true);
  });

  it('INPUT-04 INPUT-15 compositionend 전에 isComposing false·keyCode 27로 온 Esc도 조합용이다', () => {
    expect(isCompositionEscape(escape(), { composing: true, imeEdited: false })).toBe(true);
  });

  it('INPUT-04 INPUT-15 입력기가 글자를 확정한 바로 뒤의 Esc(WKWebView 한글)는 조합용이다', () => {
    expect(isCompositionEscape(escape(), { composing: false, imeEdited: true })).toBe(true);
  });
});

describe('조합 추적', () => {
  it('INPUT-04 INPUT-15 입력기 편집(insertReplacementText) 뒤 첫 keydown이 Esc면 조합용이고, 다음 Esc는 아니다', () => {
    const tracker = new CompositionTracker();
    tracker.input('insertReplacementText');
    expect(tracker.state).toEqual({ composing: false, imeEdited: true });
    expect(tracker.keydown(escape())).toBe(true);
    expect(tracker.keydown(escape())).toBe(false);
  });

  it('INPUT-04 입력기 편집 뒤 다른 키(Space 등)를 누르면 그 뒤 Esc는 조합용이 아니다', () => {
    const tracker = new CompositionTracker();
    tracker.input('insertReplacementText');
    expect(tracker.keydown({ key: ' ', isComposing: false, keyCode: 32 })).toBe(false);
    tracker.input('insertText');
    expect(tracker.keydown(escape())).toBe(false);
  });

  it('INPUT-04 INPUT-15 compositionstart부터 compositionend까지 조합 중이고, compositionend는 입력기 편집 표시도 지운다', () => {
    const tracker = new CompositionTracker();
    tracker.start();
    tracker.input('insertCompositionText');
    expect(tracker.state).toEqual({ composing: true, imeEdited: true });
    tracker.end();
    expect(tracker.state).toEqual({ composing: false, imeEdited: false });
    expect(tracker.keydown(escape())).toBe(false);
  });

  it('INPUT-04 INPUT-15 reset은 지난 조합 상태를 잊는다', () => {
    const tracker = new CompositionTracker();
    tracker.start();
    tracker.input('insertReplacementText');
    tracker.reset();
    expect(tracker.state).toEqual({ composing: false, imeEdited: false });
  });
});
