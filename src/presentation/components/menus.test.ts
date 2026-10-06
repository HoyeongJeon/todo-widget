// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { flush } from '../../testing/fake-timer.ts';
import { createTestApp } from '../../testing/test-app.ts';
import { createTranslator } from '../i18n/translator.ts';
import { WidgetViewModel } from '../widget-view-model.svelte.ts';
import ContextMenu from './ContextMenu.svelte';
import MoreMenu from './MoreMenu.svelte';
import ResetConfirm from './ResetConfirm.svelte';

afterEach(() => cleanup());

async function setup() {
  const test = await createTestApp();
  const vm = new WidgetViewModel({ app: test.app, t: createTranslator('ko'), report: () => undefined });
  return { ...test, vm };
}

const items = (container: HTMLElement): HTMLButtonElement[] => [...container.querySelectorAll<HTMLButtonElement>('.mi')];
const labels = (container: HTMLElement): string[] => items(container).map((item) => item.textContent?.trim() ?? '');

describe('⋯ 메뉴', () => {
  it('WND-10 자동 실행(체크), 투명도와 % 값과 슬라이더, 구분선, 초기화, 종료 순이다', async () => {
    const { vm } = await setup();
    await vm.openMoreMenu();
    const { container } = render(MoreMenu, { props: { vm, anchor: { top: 26, bottom: 54, right: 292 } } });
    await flush();
    expect(labels(container)).toEqual(['컴퓨터 켤 때 자동 실행', '초기화', '종료']);
    const children = [...(container.querySelector('.menu')?.children ?? [])].map((el) => el.className.split(' ')[0]);
    expect(children).toEqual(['mi', 'mctl', 'msep', 'mi', 'mi']);
    expect(container.querySelector('.mctl')?.textContent).toContain('투명도');
    expect(container.querySelector('.mctl')?.textContent).toContain('0%');
    expect(container.querySelector('input[type="range"]')).not.toBeNull();
  });

  it('WND-10 INPUT-19 방향키는 고를 수 있는 항목 사이를 돌고(비활성 초기화는 건너뜀), Enter로 고른다', async () => {
    const { vm, autoStart } = await setup();
    await vm.openMoreMenu();
    const { container } = render(MoreMenu, { props: { vm, anchor: { top: 26, bottom: 54, right: 292 } } });
    await flush();
    const menu = container.querySelector('.menu') as HTMLElement;
    expect(document.activeElement).toBe(menu);
    expect(items(container)[1]?.getAttribute('aria-disabled')).toBe('true');
    await fireEvent.keyDown(menu, { key: 'ArrowDown' });
    await fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(items(container)[2]?.classList.contains('hl')).toBe(true);
    await fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(items(container)[0]?.classList.contains('hl')).toBe(true);
    await fireEvent.keyDown(menu, { key: 'Enter' });
    await flush();
    expect([autoStart.enabled, vm.menu.open]).toEqual([true, false]);
  });

  it('WND-10 Esc를 누르면 닫는다', async () => {
    const { vm } = await setup();
    await vm.openMoreMenu();
    const { container } = render(MoreMenu, { props: { vm, anchor: { top: 26, bottom: 54, right: 292 } } });
    await flush();
    await fireEvent.keyDown(container.querySelector('.menu') as HTMLElement, { key: 'Escape' });
    expect(vm.menu.open).toBe(false);
  });

  it('WND-10 WND-12 슬라이더 안의 방향키·Space는 메뉴가 가로채지 않고, Esc는 메뉴를 닫는다', async () => {
    const { vm } = await setup();
    await vm.openMoreMenu();
    const { container } = render(MoreMenu, { props: { vm, anchor: { top: 26, bottom: 54, right: 292 } } });
    await flush();
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    const notPrevented = [
      await fireEvent.keyDown(slider, { key: 'ArrowDown' }),
      await fireEvent.keyDown(slider, { key: 'ArrowUp' }),
      await fireEvent.keyDown(slider, { key: ' ' }),
    ];
    expect(notPrevented).toEqual([true, true, true]);
    expect(container.querySelector('.mi.hl')).toBeNull();
    await fireEvent.keyDown(slider, { key: 'Escape' });
    expect(vm.menu.open).toBe(false);
  });

  it('WND-10 WND-12 슬라이더에 포커스가 있을 때 Enter는 강조된 항목을 고르지 않는다', async () => {
    const { vm, process } = await setup();
    await vm.openMoreMenu();
    const { container } = render(MoreMenu, { props: { vm, anchor: { top: 26, bottom: 54, right: 292 } } });
    await flush();
    await fireEvent.keyDown(container.querySelector('.menu') as HTMLElement, { key: 'ArrowUp' });
    expect(items(container)[2]?.classList.contains('hl')).toBe(true);
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(await fireEvent.keyDown(slider, { key: 'Enter' })).toBe(true);
    await flush();
    expect([vm.menu.open, process.exits]).toEqual([true, 0]);
  });

  it('WND-12 슬라이더를 움직이면 % 값과 카드 불투명도에 바로 보인다', async () => {
    const { vm } = await setup();
    await vm.openMoreMenu();
    const { container } = render(MoreMenu, { props: { vm, anchor: { top: 26, bottom: 54, right: 292 } } });
    await flush();
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    await fireEvent.input(slider, { target: { value: '30' } });
    expect(container.querySelector('.pct')?.textContent).toBe('30%');
    expect(vm.menu.cardOpacity).toBe(0.7);
    slider.dispatchEvent(new WheelEvent('wheel', { deltaY: -3, deltaMode: 1, cancelable: true }));
    await flush();
    expect(container.querySelector('.pct')?.textContent).toBe('32%');
  });
});

describe('우클릭 메뉴', () => {
  it('INPUT-12 할 일·하는 중·끝낸 일(지금 상태에 체크)·이름 바꾸기·삭제 순이고, 고르면 바로 바뀐다', async () => {
    const { vm, app } = await setup();
    vm.add('장보기');
    const itemId = app.session.items[0]?.id ?? '';
    vm.openContextMenu(itemId, 100, 120);
    const { container } = render(ContextMenu, { props: { vm, target: { itemId, x: 100, y: 120 }, stage: document.body } });
    await flush();
    expect(labels(container)).toEqual(['할 일', '하는 중', '끝낸 일', '이름 바꾸기', '삭제']);
    expect(items(container).map((item) => item.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false', null, null]);
    expect(container.querySelector('.msep')).not.toBeNull();
    await fireEvent.click(items(container)[1] as HTMLButtonElement);
    expect([app.session.items[0]?.status, vm.contextMenu]).toEqual(['doing', null]);
  });
});

describe('초기화 확인 판', () => {
  it('INPUT-18 개수를 묻고, 바깥을 누르면 아무것도 지우지 않고 닫으며, 모두 지우기를 누르면 지운다', async () => {
    const { vm, app } = await setup();
    vm.add('보고서\n장보기');
    vm.openReset();
    const { container } = render(ResetConfirm, { props: { vm, stage: document.body } });
    expect(container.querySelector('.q')?.textContent).toBe('할 일 2개를 모두 지울까요?');
    expect(container.querySelector('.w')?.textContent).toBe('지운 뒤에는 되돌릴 수 없어요.');
    const buttons = [...container.querySelectorAll('button')].map((button) => button.textContent);
    expect(buttons).toEqual(['취소', '모두 지우기']);
    await fireEvent.click(container.querySelector('.confirm') as HTMLElement);
    expect(vm.confirmingReset).toBe(true);
    await fireEvent.click(container.querySelector('.overlay') as HTMLElement);
    expect([vm.confirmingReset, app.session.items.length]).toEqual([false, 2]);
    vm.openReset();
    await fireEvent.click(container.querySelector('.danger') as HTMLElement);
    expect([vm.confirmingReset, app.session.items.length]).toEqual([false, 0]);
  });
});
