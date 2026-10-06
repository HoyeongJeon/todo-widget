// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { allowsNativeContextMenu } from './native-context-menu.ts';

function input(type: string | null): HTMLInputElement {
  const element = document.createElement('input');
  if (type !== null)
    element.setAttribute('type', type);
  return element;
}

describe('OS 기본 우클릭 메뉴', () => {
  it('INPUT-12 글을 쓰는 칸만 OS 기본 우클릭 메뉴를 허용하고 투명도 슬라이더는 막는다', () => {
    expect(allowsNativeContextMenu(document.createElement('textarea'))).toBe(true);
    for (const type of [null, '', 'text', 'search', 'url', 'email', 'password'])
      expect(allowsNativeContextMenu(input(type))).toBe(true);
    for (const type of ['range', 'checkbox', 'button'])
      expect(allowsNativeContextMenu(input(type))).toBe(false);
    expect(allowsNativeContextMenu(document.createElement('div'))).toBe(false);
    expect(allowsNativeContextMenu(null)).toBe(false);
  });
});
