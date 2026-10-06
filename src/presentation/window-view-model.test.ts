import { describe, expect, it } from 'vitest';
import { flush } from '../testing/fake-timer.ts';
import { createTestApp } from '../testing/test-app.ts';
import { MENU_SHADOW } from './menu/menu-placement.ts';
import { WindowViewModel } from './window-view-model.svelte.ts';

async function setup() {
  const test = await createTestApp();
  const reports: string[] = [];
  const vm = new WindowViewModel({ placement: test.app.placement, report: (action) => reports.push(action) });
  return { ...test, vm, reports };
}

describe('창 화면 상태', () => {
  it('WND-03 처음에는 내용 높이에 맞춘 뒤 창을 보인다', async () => {
    const { vm, window } = await setup();
    expect(vm.maxCardHeight).toBe(500);
    vm.contentResized(150);
    expect(window.heightCalls).toEqual([]);
    await vm.showFirst(200, 7);
    expect(window.current.height).toBe(200);
    expect(window.shown).toEqual([7]);
    expect(vm.baseHeight).toBe(200);
    await vm.showFirst(300, 8);
    expect(window.shown).toEqual([7]);
  });

  it('WND-03 끄는 동안은 resizing이고, 놓으면 새 최대 높이를 쓴다', async () => {
    const { vm, window } = await setup();
    await vm.showFirst(200, 0);
    let release: () => void = () => undefined;
    window.resizeGate = new Promise((resolve) => {
      release = resolve;
    });
    window.resizeResult = { left: 1576, top: 24, width: 320, height: 600 };
    const resizing = vm.resize('South', { screenX: 0, screenY: 0 });
    expect(vm.resizing).toBe(true);
    vm.contentResized(580);
    await flush();
    expect(window.heightCalls).toEqual([{ height: 200, raise: 0 }]);
    release();
    await resizing;
    expect(vm.resizing).toBe(false);
    expect(vm.maxCardHeight).toBe(580);
    // 끄는 동안 받은 내용 높이로 놓은 뒤 한 번 맞춘다.
    expect(window.heightCalls).toEqual([{ height: 200, raise: 0 }, { height: 580, raise: 0 }]);
    expect(vm.baseHeight).toBe(580);
  });

  it('WND-03 끌어 키운 뒤 메뉴를 열고 닫아도 놓은 높이로 돌아간다', async () => {
    const { vm, window } = await setup();
    await vm.showFirst(520, 0);
    let release: () => void = () => undefined;
    window.resizeGate = new Promise((resolve) => {
      release = resolve;
    });
    window.resizeResult = { left: 1576, top: 24, width: 320, height: 700 };
    const resizing = vm.resize('South', { screenX: 0, screenY: 0 });
    // 끄는 동안 카드는 창을 채우고, 놓은 뒤에도 카드 높이가 그대로라 ResizeObserver가 다시 알리지 않는다.
    vm.contentResized(700);
    release();
    await resizing;
    expect(window.heightCalls).toEqual([]);
    await vm.fitPopup(vm.popupToken, { top: 58, bottom: 760 }, MENU_SHADOW);
    expect(window.current.height).toBe(776);
    await vm.clearPopup();
    expect([window.current.top, window.current.height, vm.baseHeight]).toEqual([24, 700, 700]);
    expect(window.heightCalls.map((call) => call.height)).toEqual([776, 700]);
  });

  it('WND-10 메뉴가 창보다 크면 늘리고, 닫으면 내용 높이로 되돌린다', async () => {
    const { vm, window } = await setup();
    await vm.showFirst(200, 0);
    await vm.fitPopup(vm.popupToken, { top: 58, bottom: 258 }, MENU_SHADOW);
    expect([window.current.top, window.current.height, vm.lift]).toEqual([24, 274, 0]);
    expect(vm.baseHeight).toBe(200);
    await vm.clearPopup();
    expect([window.current.top, window.current.height]).toEqual([24, 200]);
  });

  it('WND-10 위로 열린 메뉴는 창 위쪽을 올리고 내용을 그만큼 아래로 민다', async () => {
    const { vm, window } = await setup();
    await vm.showFirst(200, 0);
    await vm.fitPopup(vm.popupToken, { top: -128, bottom: 22 }, MENU_SHADOW);
    expect([window.current.top, window.current.height, vm.lift]).toEqual([-110, 334, 134]);
    await vm.clearPopup();
    expect([window.current.top, window.current.height, vm.lift]).toEqual([24, 200, 0]);
  });

  it('WND-10 D11 내용은 창을 올린 뒤에 밀고, 창을 되돌린 뒤에 올린다. 창보다 먼저 움직여 카드가 튀지 않게 한다', async () => {
    const { vm, window } = await setup();
    await vm.showFirst(200, 0);
    const liftWhenWindowMoves: number[] = [];
    const setHeight = window.setHeight.bind(window);
    window.setHeight = async (height, raise) => {
      liftWhenWindowMoves.push(vm.lift);
      await setHeight(height, raise);
    };
    await vm.fitPopup(vm.popupToken, { top: -128, bottom: 22 }, MENU_SHADOW);
    expect(vm.lift).toBe(134);
    await vm.clearPopup();
    expect(vm.lift).toBe(0);
    expect(liftWhenWindowMoves).toEqual([0, 134]);
  });

  it('WND-10 D11 늘린 창을 되돌리지 못하면 창이 올라간 채라 내용도 민 채로 둔다', async () => {
    const { vm, window, reports } = await setup();
    await vm.showFirst(200, 0);
    await vm.fitPopup(vm.popupToken, { top: -128, bottom: 22 }, MENU_SHADOW);
    window.setHeight = async () => {
      throw new Error('창을 바꾸지 못했어요');
    };
    await vm.clearPopup();
    expect([window.current.top, vm.lift, reports]).toEqual([-110, 134, ['restore']]);
  });

  it('WND-10 판이 창 안에 들어가면 늘리지 않고, 늘려 둔 창은 되돌린다', async () => {
    const { vm, window } = await setup();
    await vm.showFirst(300, 0);
    await vm.fitPopup(vm.popupToken, { top: 58, bottom: 400 }, MENU_SHADOW);
    expect(window.current.height).toBe(416);
    await vm.fitPopup(vm.popupToken, { top: 58, bottom: 208 }, MENU_SHADOW);
    expect(window.current.height).toBe(300);
  });

  it('WND-10 자리를 정하는 동안 메뉴가 닫혔으면 늦게 온 늘리기는 버린다', async () => {
    const { vm, window } = await setup();
    await vm.showFirst(200, 0);
    const token = vm.popupToken;
    await vm.clearPopup();
    await vm.fitPopup(token, { top: -128, bottom: 258 }, MENU_SHADOW);
    expect([window.current.top, window.current.height, vm.lift]).toEqual([24, 200, 0]);
  });

  it('WND-10 창을 늘리지 못하면 내용을 아래로 밀지 않는다', async () => {
    const { vm, window, reports } = await setup();
    await vm.showFirst(200, 0);
    window.setHeight = async () => {
      throw new Error('창을 바꾸지 못했어요');
    };
    await vm.fitPopup(vm.popupToken, { top: -128, bottom: 22 }, MENU_SHADOW);
    expect([vm.lift, reports]).toEqual([0, ['expand']]);
  });

  it('WND-10 창 위아래 공간을 읽지 못하면 아래가 넉넉하다고 본다', async () => {
    const { vm, window } = await setup();
    window.failBounds = true;
    expect(await vm.room()).toEqual({ above: 0, below: Number.POSITIVE_INFINITY });
  });
});
