import { SHADOW_MARGIN } from '../../domain/window-geometry.ts';

/** ⋯ 버튼과 메뉴 사이 간격 (WND-10). */
export const MENU_GAP = 4;

/** 판 위아래에 비워 둘 그림자 자리. */
export interface Allowance {
  top: number;
  bottom: number;
}

/** 메뉴 판 그림자 자리. v1.4 MenuShadowMargin(위 6, 아래 16)과 같다. */
export const MENU_SHADOW: Allowance = { top: 6, bottom: 16 };

/** 위치는 모두 창(내용을 밀기 전) 왼쪽 위 기준 CSS px다. */
export interface Anchor {
  top: number;
  bottom: number;
  right: number;
}

export interface Size {
  width: number;
  height: number;
}

/** 창 위아래로 남은 화면 공간 (WindowPlacement.roomAround). */
export interface Room {
  above: number;
  below: number;
}

export interface Position {
  left: number;
  top: number;
}

/**
 * ⋯ 메뉴: 버튼 바로 아래(간격 4)에 오른쪽 끝을 버튼 오른쪽 끝에 맞춘다. 창을 늘려서라도 화면 안에 들어가면 아래로,
 * 아래 공간이 모자라면 버튼 위로 뜬다. 위도 모자라면 아래로 뜬다 (WND-10).
 */
export function placeMoreMenu(anchor: Anchor, menu: Size, windowHeight: number, room: Room): Position {
  const left = anchor.right - menu.width;
  const below = anchor.bottom + MENU_GAP;
  if (below + menu.height + MENU_SHADOW.bottom <= windowHeight + Math.max(0, room.below))
    return { left, top: below };
  const above = anchor.top - MENU_GAP - menu.height;
  if (above - MENU_SHADOW.top >= -Math.max(0, room.above))
    return { left, top: above };
  return { left, top: below };
}

/**
 * 우클릭 메뉴: 판 왼쪽 위가 커서 자리다(v1.4 T:152-154). 창 오른쪽을 넘으면 왼쪽으로 민다.
 * 아래 공간(창 아래 화면 공간 포함)이 모자라고 위 공간이 있으면 커서 위로 뜬다. 둘 다 모자라면 더 넓은 쪽으로 뜬다.
 */
export function placeContextMenu(at: { x: number; y: number }, menu: Size, window: Size, room: Room): Position {
  const left = Math.max(SHADOW_MARGIN, Math.min(at.x, window.width - SHADOW_MARGIN - menu.width));
  const spaceBelow = window.height + Math.max(0, room.below) - at.y;
  const spaceAbove = at.y + Math.max(0, room.above);
  if (menu.height + MENU_SHADOW.bottom <= spaceBelow)
    return { left, top: at.y };
  if (menu.height + MENU_SHADOW.top <= spaceAbove)
    return { left, top: at.y - menu.height };
  return { left, top: spaceBelow >= spaceAbove ? at.y : at.y - menu.height };
}

/**
 * 판(과 그림자 자리)이 창 밖으로 나가면 창을 얼마나 늘려야 하는지. raise는 창 위쪽을 올릴 만큼, height는 늘린 뒤 전체 높이다.
 * 늘릴 필요가 없으면 null (WND-10, 설계 문서 6장 "메뉴가 창보다 크면 메뉴가 열린 동안 창을 투명하게 늘린다").
 */
export function popupExtent(popup: { top: number; bottom: number }, windowHeight: number, allowance: Allowance): { raise: number; height: number } | null {
  const top = Math.min(0, Math.floor(popup.top - allowance.top));
  const bottom = Math.max(windowHeight, Math.ceil(popup.bottom + allowance.bottom));
  if (top === 0 && bottom === windowHeight)
    return null;
  // 0 - top: top이 0일 때 -0이 아니라 0이 되게 한다.
  return { raise: 0 - top, height: bottom - top };
}
