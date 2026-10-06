// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { flush } from '../testing/fake-timer.ts';
import { createTestApp } from '../testing/test-app.ts';
import App from './App.svelte';
import { createTranslator } from './i18n/translator.ts';
import { MENU_SHADOW } from './menu/menu-placement.ts';
import { WidgetViewModel } from './widget-view-model.svelte.ts';

beforeAll(() => {
  // happy-dom에는 ResizeObserver가 없다. App은 처음 크기를 mount 때 바로 재므로 알림이 오지 않아도 된다.
  if (!('ResizeObserver' in globalThis)) {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    });
  }
});

afterEach(() => cleanup());

async function setup() {
  const test = await createTestApp();
  const vm = new WidgetViewModel({ app: test.app, t: createTranslator('ko'), report: () => undefined });
  const view = render(App, { props: { vm, startedAt: 0 } });
  await flush();
  const $ = <T extends Element>(selector: string): T => {
    const found = view.container.querySelector<T>(selector);
    if (!found)
      throw new Error(`${selector}가 없어요`);
    return found;
  };
  const all = (selector: string): Element[] => [...view.container.querySelectorAll(selector)];
  const input = $<HTMLInputElement>('input.field');
  /** 우클릭 메뉴·⋯ 메뉴의 항목들. */
  const menuItems = (): HTMLElement[] => all('.mi') as HTMLElement[];
  const moreButton = (): HTMLButtonElement => all('.iconbtn')[1] as HTMLButtonElement;
  /** 가장자리는 누르면 pointer를 잡는다. happy-dom에는 setPointerCapture가 없다. */
  const edge = (name: string): HTMLElement => {
    const found = $<HTMLElement>(`.edge.${name}`);
    found.setPointerCapture = () => undefined;
    return found;
  };
  return { ...test, vm, view, $, all, input, menuItems, moreButton, edge };
}

/** 실제 앱처럼 theme.css와 App.svelte의 style을 문서에 넣는다. 테스트는 컴포넌트 CSS를 싣지 않는다. 돌려준 함수로 뺀다. */
function loadStyles(): () => void {
  const app = readFileSync(join(import.meta.dirname, 'App.svelte'), 'utf8');
  const sheets = [readFileSync(join(import.meta.dirname, 'theme/theme.css'), 'utf8'), /<style>([\s\S]*?)<\/style>/.exec(app)?.[1] ?? ''];
  const elements = sheets.map((text) => {
    const style = document.createElement('style');
    style.textContent = text;
    document.head.append(style);
    return style;
  });
  return () => elements.forEach((style) => style.remove());
}

/** happy-dom은 배치를 계산하지 않는다. 메뉴 판이 실제 크기를 가진 것처럼 잰다. 돌려준 함수로 되돌린다. */
function sizeMenus(width: number, height: number): () => void {
  const proto = HTMLElement.prototype;
  const originals = (['offsetWidth', 'offsetHeight'] as const).map((name) => [name, Object.getOwnPropertyDescriptor(proto, name)] as const);
  for (const [name, original] of originals) {
    Object.defineProperty(proto, name, {
      configurable: true,
      get(this: HTMLElement) {
        if (this.classList.contains('menu'))
          return name === 'offsetWidth' ? width : height;
        return original?.get?.call(this) ?? 0;
      },
    });
  }
  return () => {
    for (const [name, original] of originals) {
      if (original)
        Object.defineProperty(proto, name, original);
    }
  };
}

/** WebKit·Chromium처럼 visibility: hidden인 요소(그 조상 포함)에는 포커스를 주지 않는다. happy-dom은 준다. 돌려준 함수로 되돌린다. */
function refuseHiddenFocus(): () => void {
  const original = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (this: HTMLElement, options?: FocusOptions): void {
    for (let el: HTMLElement | null = this; el; el = el.parentElement) {
      if (el.style.visibility === 'hidden')
        return;
    }
    original.call(this, options);
  };
  return () => {
    HTMLElement.prototype.focus = original;
  };
}

/** 넘친 부분을 잘라 내는 overflow 값인지. visible만 잘라 내지 않는다. */
function clips(style: CSSStyleDeclaration): boolean {
  return [style.overflow, style.overflowX, style.overflowY].some((value) => value !== '' && value !== 'visible');
}

/**
 * 판을 담은 조상 중 overflow로 넘친 부분을 잘라 내는 것. 창을 늘려도 이런 조상이 있으면 판 아래가 창 원래 높이에서 잘린다.
 * html의 overflow는 viewport(창)에 쓰이므로 뺀다. viewport는 늘린 창만큼 커진다.
 */
function clippingAncestors(element: HTMLElement): string[] {
  const found: string[] = [];
  for (let el = element.parentElement; el && el !== document.documentElement; el = el.parentElement) {
    if (clips(getComputedStyle(el)))
      found.push(el.tagName.toLowerCase() + (el.className ? `.${el.className.split(' ')[0]}` : ''));
  }
  return found;
}

describe('위젯 화면', () => {
  it('INPUT-02 LIST-06 입력칸 Enter로 추가하면 줄과 남은 개수가 바로 보인다', async () => {
    const { input, all, $ } = await setup();
    await fireEvent.input(input, { target: { value: '보고서' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    await flush();
    expect(all('.row').map((row) => row.textContent?.trim())).toEqual(['보고서']);
    expect($('.remaining').textContent).toBe('1개 남음');
    expect(input.value).toBe('');
  });

  it('INPUT-12 우클릭 메뉴에서 상태를 고르면 줄이 바뀌고 메뉴가 닫힌다', async () => {
    const { app, $, all, menuItems } = await setup();
    app.session.add('보고서');
    await flush();
    await fireEvent.contextMenu($('.row'), { clientX: 50, clientY: 80 });
    await flush();
    expect(menuItems().map((item) => item.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false', null, null]);
    await fireEvent.click(menuItems()[1] as HTMLElement);
    await flush();
    expect($('.row').classList.contains('doing')).toBe(true);
    expect(all('.menu')).toHaveLength(0);
  });

  it('INPUT-12 우클릭 메뉴가 열린 동안 상태가 바뀌면 체크도 따라 바뀐다', async () => {
    const { app, $, menuItems } = await setup();
    app.session.add('보고서');
    await flush();
    await fireEvent.contextMenu($('.row'), { clientX: 50, clientY: 80 });
    await flush();
    app.session.setStatus(app.session.items[0]?.id ?? '', 'done');
    await flush();
    expect(menuItems().map((item) => item.getAttribute('aria-checked')).slice(0, 3)).toEqual(['false', 'false', 'true']);
  });

  it('INPUT-12 WND-10 우클릭 메뉴가 창 아래로 나가면 판 전체가 들어가게 창을 늘리고, 화면의 어느 조상도 판을 창 원래 높이에서 잘라 내지 않는다', async () => {
    const unload = loadStyles();
    const unsize = sizeMenus(150, 180);
    try {
      const { app, vm, window, $ } = await setup();
      app.session.add('보고서');
      await flush();
      const base = vm.window.baseHeight;
      const focus = vi.spyOn(HTMLElement.prototype, 'focus');
      await fireEvent.contextMenu($('.row'), { clientX: 50, clientY: base - 10 });
      await flush();
      const menu = $<HTMLElement>('.menu');
      // 판에 포커스를 줄 때 문서를 스크롤하지 않는다. 늘린 창이 화면에 반영되기 전이면 카드가 위로 밀린다.
      const menuFocus = focus.mock.calls.filter((_, index) => focus.mock.contexts[index] === menu);
      focus.mockRestore();
      expect(menuFocus).toEqual([[{ preventScroll: true }]]);
      // 창 아래 화면 공간이 넉넉하므로 판 왼쪽 위가 커서 자리다(D6, v1.4 T:152-154).
      expect(menu.style.top).toBe(`${base - 10}px`);
      expect(window.current.height).toBeGreaterThanOrEqual(base - 10 + 180 + MENU_SHADOW.bottom);
      expect(clippingAncestors(menu)).toEqual([]);
    } finally {
      unsize();
      unload();
    }
  });

  it('WND-10 위젯이 짧아 ⋯ 메뉴가 창 아래로 나가면 판 전체가 들어가게 창을 늘리고, 어느 조상도 판을 잘라 내지 않는다', async () => {
    const unload = loadStyles();
    const unsize = sizeMenus(170, 200);
    try {
      const { vm, window, $, moreButton } = await setup();
      const base = vm.window.baseHeight;
      await fireEvent.click(moreButton());
      await flush();
      const menu = $<HTMLElement>('.menu');
      const top = Number.parseFloat(menu.style.top);
      expect(top + 200 + MENU_SHADOW.bottom).toBeGreaterThan(base);
      expect(window.current.height).toBeGreaterThanOrEqual(top + 200 + MENU_SHADOW.bottom);
      expect(clippingAncestors(menu)).toEqual([]);
    } finally {
      unsize();
      unload();
    }
  });

  it('WND-10 ⋯ 메뉴 바깥(backdrop)을 누르면 닫히고 늘린 창을 되돌린다', async () => {
    const { vm, window, $, moreButton } = await setup();
    await fireEvent.click(moreButton());
    await flush();
    expect(vm.menu.open).toBe(true);
    // happy-dom은 배치를 계산하지 않아 메뉴가 창 안에 든다. 창 밖으로 나간 메뉴처럼 늘려 둔다.
    await vm.window.fitPopup(vm.window.popupToken, { top: 0, bottom: 1000 }, { top: 0, bottom: 0 });
    const expanded = window.current.height;
    const token = vm.window.popupToken;
    await fireEvent.pointerDown($('.backdrop'));
    await flush();
    expect(vm.menu.open).toBe(false);
    expect(vm.window.popupToken).toBeGreaterThan(token);
    expect(window.current.height).toBeLessThan(expanded);
    expect(window.current.height).toBe(vm.window.baseHeight);
  });

  it('INPUT-18 WND-03 확인 판이 열린 채 가장자리를 누르면 판만 닫힌다', async () => {
    const { app, vm, window, all, edge } = await setup();
    app.session.add('보고서');
    await flush();
    vm.openReset();
    await flush();
    expect(all('.overlay')).toHaveLength(1);
    await fireEvent.pointerDown(edge('south'), { button: 0, pointerId: 1, screenX: 0, screenY: 0 });
    await flush();
    expect([window.resizeCalls.length, vm.confirmingReset, vm.window.resizing]).toEqual([0, false, false]);
    expect(all('.overlay')).toHaveLength(0);
  });

  it('INPUT-12 글을 쓰는 칸만 OS 기본 우클릭 메뉴를 허용하고 투명도 슬라이더는 막는다', async () => {
    const { input, $, moreButton } = await setup();
    expect(await fireEvent.contextMenu(input)).toBe(true);
    await fireEvent.click(moreButton());
    await flush();
    expect(await fireEvent.contextMenu($('input[type="range"]'))).toBe(false);
    expect(await fireEvent.contextMenu($('.header'))).toBe(false);
  });

  it('INPUT-12 WND-02 WND-03 macOS Control+클릭은 창 끌기나 크기 조절을 시작하지 않는다', async () => {
    const { window, $, edge } = await setup();
    await fireEvent.pointerDown($('.header'), { button: 0, ctrlKey: true });
    await fireEvent.pointerDown(edge('east'), { button: 0, ctrlKey: true, pointerId: 1, screenX: 0, screenY: 0 });
    await flush();
    expect([window.drags, window.resizeCalls.length]).toEqual([0, 0]);
    await fireEvent.pointerDown($('.header'), { button: 0 });
    expect(window.drags).toBe(1);
  });

  it('WND-10 D6 ⋯ 메뉴와 우클릭 메뉴는 판이 보인 뒤 포커스를 받아, 방향키가 메뉴 항목 강조를 옮긴다', async () => {
    const restore = refuseHiddenFocus();
    try {
      const { app, $, all, moreButton } = await setup();
      app.session.add('보고서');
      await flush();
      await fireEvent.click(moreButton());
      await flush();
      expect(document.activeElement).toBe($('.menu'));
      await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowDown' });
      expect(all('.mi.hl')).toEqual([all('.mi')[0]]);
      await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
      await flush();
      await fireEvent.contextMenu($('.row'), { clientX: 50, clientY: 80 });
      await flush();
      expect(document.activeElement).toBe($('.menu'));
      await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowDown' });
      expect(all('.mi.hl')).toEqual([all('.mi')[0]]);
    } finally {
      restore();
    }
  });

  it('WND-10 메뉴를 닫으면 키보드 포커스가 메뉴를 열기 전 자리(입력칸)로 돌아간다', async () => {
    const { input, $, moreButton } = await setup();
    input.focus();
    await fireEvent.click(moreButton());
    await flush();
    expect(document.activeElement).toBe($('.menu'));
    await fireEvent.keyDown($('.menu'), { key: 'Escape' });
    await flush();
    expect(document.activeElement).toBe(input);
  });

  it('INPUT-18 확인 판은 열리면 취소 버튼에 포커스를 두고, Esc로 닫히며 포커스는 입력칸으로 돌아간다', async () => {
    const { app, vm, input, $, all } = await setup();
    app.session.add('보고서');
    await flush();
    input.focus();
    vm.openReset();
    await flush();
    expect(document.activeElement).toBe($('.pill:not(.danger)'));
    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    await flush();
    expect([vm.confirmingReset, all('.overlay').length, app.session.items.length]).toEqual([false, 0, 1]);
    expect(document.activeElement).toBe(input);
  });

  it('INPUT-18 ⋯ 메뉴에서 키보드로 초기화를 고르면(WebKit 포커스 규칙) 포커스는 취소에 있고, → 한 번에 모두 지우기로, ← 한 번에 취소로 간다', async () => {
    const restore = refuseHiddenFocus();
    try {
      const { app, input, $, moreButton } = await setup();
      app.session.add('보고서');
      await flush();
      input.focus();
      await fireEvent.click(moreButton());
      await flush();
      await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowDown' });
      await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowDown' });
      await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Enter' });
      await flush();
      const [cancel, confirm] = [$('.pill:not(.danger)'), $('.pill.danger')];
      expect(document.activeElement).toBe(cancel);
      await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowRight' });
      expect(document.activeElement).toBe(confirm);
      await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowLeft' });
      expect(document.activeElement).toBe(cancel);
    } finally {
      restore();
    }
  });

  it('INPUT-18 확인 판이 열린 동안 포커스가 판 밖(입력칸)에 있어도 ←·→는 한 번에 버튼으로 가고, Enter는 할 일을 더하지 않고 취소를 누른다', async () => {
    const { app, vm, input, $, all } = await setup();
    app.session.add('보고서');
    await flush();
    vm.openReset();
    await flush();
    const cancelReset = vi.spyOn(vm, 'cancelReset');
    input.focus();
    await fireEvent.input(input, { target: { value: '장보기' } });
    await fireEvent.keyDown(input, { key: 'ArrowRight' });
    expect(document.activeElement).toBe($('.pill.danger'));
    input.focus();
    await fireEvent.keyDown(input, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe($('.pill:not(.danger)'));
    input.focus();
    await fireEvent.keyDown(input, { key: 'Enter' });
    await flush();
    expect([cancelReset.mock.calls.length, vm.confirmingReset, all('.overlay').length, app.session.items.map((item) => item.title)]).toEqual([1, false, 0, ['보고서']]);
  });

  it('INPUT-18 확인 판의 Esc·Enter는 한 번만 처리한다', async () => {
    const { app, vm, $ } = await setup();
    app.session.add('보고서');
    await flush();
    vm.openReset();
    await flush();
    const cancelReset = vi.spyOn(vm, 'cancelReset');
    await fireEvent.keyDown($('.pill:not(.danger)'), { key: 'Escape' });
    expect(cancelReset.mock.calls.length).toBe(1);
    vm.openReset();
    await flush();
    const confirmReset = vi.spyOn(vm, 'confirmReset');
    await fireEvent.keyDown($('.pill:not(.danger)'), { key: 'ArrowRight' });
    await fireEvent.keyDown($('.pill.danger'), { key: 'Enter' });
    expect(confirmReset.mock.calls.length).toBe(1);
  });

  it('INPUT-13 우클릭 메뉴에서 이름 바꾸기를 고르면 포커스는 이름 바꾸기 칸에 남는다', async () => {
    const { app, input, $, menuItems } = await setup();
    app.session.add('보고서');
    await flush();
    input.focus();
    await fireEvent.contextMenu($('.row'), { clientX: 50, clientY: 80 });
    await flush();
    await fireEvent.click(menuItems()[3] as HTMLElement);
    await flush();
    expect(document.activeElement).toBe($('textarea'));
  });

  it('INPUT-18 ⋯ 메뉴의 초기화를 고르면 포커스는 확인 판의 취소 버튼에 있다', async () => {
    const { app, input, $, menuItems, moreButton } = await setup();
    app.session.add('보고서');
    await flush();
    input.focus();
    await fireEvent.click(moreButton());
    await flush();
    await fireEvent.click(menuItems()[1] as HTMLElement);
    await flush();
    expect(document.activeElement).toBe($('.pill:not(.danger)'));
  });
});
