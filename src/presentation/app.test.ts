// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { flush } from '../testing/fake-timer.ts';
import { createTestApp } from '../testing/test-app.ts';
import App from './App.svelte';
import { createTranslator } from './i18n/translator.ts';
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
