import { describe, expect, it } from 'vitest';
import { MENU_SHADOW, placeContextMenu, placeMoreMenu, popupExtent } from './menu-placement.ts';

/** 폭 320 창의 ⋯ 버튼: 창 위 10 + 카드 위 여백 16에서 28 높이, 오른쪽 끝은 320 - 10 - 18. */
const more = { top: 26, bottom: 54, right: 292 };
const menu = { width: 222, height: 150 };

describe('메뉴 위치', () => {
  it('WND-10 ⋯ 메뉴는 버튼 바로 아래 4에 오른쪽 끝을 맞춰 뜬다', () => {
    expect(placeMoreMenu(more, menu, 300, { above: 24, below: 500 })).toEqual({ left: 70, top: 58 });
  });

  it('WND-10 창보다 길어도 창 아래 화면 공간에 들어가면 아래로 뜬다', () => {
    expect(placeMoreMenu(more, menu, 200, { above: 24, below: 100 })).toEqual({ left: 70, top: 58 });
  });

  it('WND-10 아래 공간이 모자라면 버튼 위로 뜬다', () => {
    expect(placeMoreMenu(more, menu, 200, { above: 400, below: 0 })).toEqual({ left: 70, top: -128 });
  });

  it('WND-10 위아래 모두 모자라면 아래로 뜬다', () => {
    expect(placeMoreMenu(more, menu, 200, { above: 50, below: 0 })).toEqual({ left: 70, top: 58 });
  });

  it('INPUT-12 우클릭 메뉴는 판 왼쪽 위가 커서 자리이고, 창 오른쪽을 넘지 않게 왼쪽으로 민다', () => {
    const size = { width: 150, height: 170 };
    const window = { width: 320, height: 300 };
    expect(placeContextMenu({ x: 100, y: 120 }, size, window, { above: 0, below: 500 })).toEqual({ left: 100, top: 120 });
    expect(placeContextMenu({ x: 250, y: 120 }, size, window, { above: 0, below: 500 })).toEqual({ left: 160, top: 120 });
  });

  it('INPUT-12 우클릭 메뉴는 아래 공간이 모자라고 위 공간이 있으면 커서 위로 뜬다', () => {
    expect(placeContextMenu({ x: 100, y: 120 }, { width: 150, height: 170 }, { width: 320, height: 300 }, { above: 100, below: 0 })).toEqual({ left: 100, top: -50 });
  });

  it('INPUT-12 위아래 모두 모자라면 공간이 더 넓은 쪽으로 뜬다', () => {
    const size = { width: 150, height: 170 };
    const window = { width: 320, height: 300 };
    expect(placeContextMenu({ x: 100, y: 120 }, size, window, { above: 0, below: 0 })).toEqual({ left: 100, top: 120 });
    expect(placeContextMenu({ x: 100, y: 250 }, size, window, { above: 0, below: 0 })).toEqual({ left: 100, top: 80 });
  });
});

describe('메뉴용 창 늘리기', () => {
  it('WND-10 판과 그림자가 창 안에 들어가면 늘리지 않는다', () => {
    expect(popupExtent({ top: 58, bottom: 208 }, 300, MENU_SHADOW)).toBeNull();
    expect(popupExtent({ top: 10, bottom: 190 }, 200, { top: 0, bottom: 10 })).toBeNull();
  });

  it('WND-10 판이 창 아래로 나가면 그림자까지 들어가게 높이를 늘린다', () => {
    expect(popupExtent({ top: 58, bottom: 258 }, 200, MENU_SHADOW)).toEqual({ raise: 0, height: 274 });
  });

  it('WND-10 판이 창 위로 나가면 창 위쪽을 올리고 그만큼 높이를 늘린다', () => {
    expect(popupExtent({ top: -128, bottom: 22 }, 200, MENU_SHADOW)).toEqual({ raise: 134, height: 334 });
  });
});
