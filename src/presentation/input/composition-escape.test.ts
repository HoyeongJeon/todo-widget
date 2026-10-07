import { describe, expect, it } from 'vitest';
import { CompositionTracker, isCompositionEscape } from './composition-escape.ts';

const escape = (overrides: Partial<{ key: string; isComposing: boolean; keyCode: number }> = {}) => ({
  key: 'Escape',
  isComposing: false,
  keyCode: 27,
  ...overrides,
});

const idle = { composing: false, imeEdited: false, justEnded: false };

describe('IME 조합을 끝내는 Esc', () => {
  it('INPUT-04 INPUT-15 조합과 관계없는 Esc는 조합용이 아니다', () => {
    expect(isCompositionEscape(escape(), idle)).toBe(false);
  });

  it('INPUT-04 INPUT-15 Esc가 아닌 키는 판단하지 않는다', () => {
    expect(isCompositionEscape(escape({ key: 'Enter', keyCode: 13 }), { composing: true, imeEdited: true, justEnded: true })).toBe(false);
  });

  it('INPUT-04 INPUT-15 브라우저가 조합 중이라고 알리는 Esc(isComposing, keyCode 229)는 조합용이다', () => {
    expect(isCompositionEscape(escape({ isComposing: true }), idle)).toBe(true);
    expect(isCompositionEscape(escape({ keyCode: 229 }), idle)).toBe(true);
  });

  it('INPUT-04 INPUT-15 compositionend 전에 isComposing false·keyCode 27로 온 Esc도 조합용이다', () => {
    expect(isCompositionEscape(escape(), { ...idle, composing: true })).toBe(true);
  });

  it('INPUT-04 INPUT-15 입력기가 글자를 확정한 바로 뒤의 Esc(WKWebView 한글)는 조합용이다', () => {
    expect(isCompositionEscape(escape(), { ...idle, imeEdited: true })).toBe(true);
  });

  it('INPUT-04 INPUT-15 isCompositionEscape는 justEnded 상태의 Esc를 조합용으로 본다', () => {
    expect(isCompositionEscape(escape(), { ...idle, justEnded: true })).toBe(true);
  });
});

describe('조합 추적', () => {
  it('INPUT-04 INPUT-15 입력기 편집(insertReplacementText) 뒤 첫 keydown이 Esc면 조합용이고, 다음 Esc는 아니다', () => {
    const tracker = new CompositionTracker();
    tracker.input('insertReplacementText');
    expect(tracker.state).toEqual({ composing: false, imeEdited: true, justEnded: false });
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

  it('INPUT-04 INPUT-15 compositionstart부터 compositionend까지 조합 중이고, compositionend는 입력기 편집 표시를 지우고 "막 끝남" 표시를 켠다', () => {
    const tracker = new CompositionTracker();
    tracker.start();
    tracker.input('insertCompositionText');
    expect(tracker.state).toEqual({ composing: true, imeEdited: true, justEnded: false });
    tracker.end();
    expect(tracker.state).toEqual({ composing: false, imeEdited: false, justEnded: true });
    tracker.keyup();
    expect(tracker.keydown(escape())).toBe(false);
  });

  it('INPUT-04 INPUT-15 compositionend 바로 뒤 첫 keydown이 Esc면 조합용이다(WebView2 한글은 조합을 끝낸 Esc를 compositionend 뒤 keyCode 27로 보낸다)', () => {
    const tracker = new CompositionTracker();
    tracker.start();
    tracker.input('insertCompositionText');
    tracker.end();
    expect(tracker.keydown(escape())).toBe(true);
    expect(tracker.state.justEnded).toBe(false);
    expect(tracker.keydown(escape())).toBe(false);
  });

  it('INPUT-04 INPUT-15 compositionend 뒤 keyup이 오면 그 뒤 Esc는 조합용이 아니다(Esc가 조합을 취소하고 IME가 먹은 경우)', () => {
    const tracker = new CompositionTracker();
    tracker.start();
    tracker.input('insertCompositionText');
    expect(tracker.keydown(escape({ keyCode: 229, isComposing: true }))).toBe(true);
    tracker.end();
    tracker.keyup();
    expect(tracker.state).toEqual({ composing: false, imeEdited: false, justEnded: false });
    expect(tracker.keydown(escape())).toBe(false);
  });

  it('INPUT-04 compositionend 뒤 다른 키(Space·Enter) keydown이 오면 그 뒤 Esc는 조합용이 아니다', () => {
    for (const key of [{ key: ' ', keyCode: 32 }, { key: 'Enter', keyCode: 13 }]) {
      const tracker = new CompositionTracker();
      tracker.start();
      tracker.input('insertCompositionText');
      tracker.end();
      expect(tracker.keydown({ ...key, isComposing: false })).toBe(false);
      expect(tracker.keydown(escape())).toBe(false);
    }
  });

  it('INPUT-04 INPUT-15 reset은 지난 조합 상태를 잊는다', () => {
    const tracker = new CompositionTracker();
    tracker.start();
    tracker.input('insertReplacementText');
    tracker.end();
    tracker.start();
    tracker.input('insertReplacementText');
    tracker.reset();
    expect(tracker.state).toEqual({ composing: false, imeEdited: false, justEnded: false });
  });
});
