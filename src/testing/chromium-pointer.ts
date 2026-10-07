import { tick } from 'svelte';

/** Blink가 마우스로 누를 때 포커스를 주는 요소. 버튼은 tabindex가 -1이어도 받는다. */
const MOUSE_FOCUSABLE = 'button, input, textarea, select, a[href], [tabindex]';

/**
 * Chromium(WebView2)처럼 누른다. happy-dom의 fireEvent.click은 포커스를 옮기지 않아 WebKit 모양만 시험된다.
 * - pointerdown → (그 사이 microtask가 돌아 Svelte가 DOM을 고친다) → mousedown.
 * - mousedown 기본 동작이 막히지 않았으면 누른 곳의 포커스 가능한 조상(button·input·textarea·[tabindex])에 포커스를 준다.
 *   그런 조상이 없거나, pointerdown 처리로 누른 요소가 이미 DOM에서 빠졌으면 포커스를 푼다(보수적 가정. Blink가 빠진 요소에서
 *   포커스를 푸는지는 확인하지 못했다).
 * - 그 뒤 mouseup, 그리고 왼쪽 버튼이면 click, 오른쪽 버튼이면 contextmenu(Windows 순서).
 */
export async function chromiumClick(target: HTMLElement, options: { button?: 0 | 2; clientX?: number; clientY?: number } = {}): Promise<void> {
  const init = { bubbles: true, cancelable: true, composed: true, button: options.button ?? 0, clientX: options.clientX ?? 0, clientY: options.clientY ?? 0 };
  target.dispatchEvent(new PointerEvent('pointerdown', { ...init, pointerId: 1, isPrimary: true }));
  await tick();
  const connected = target.isConnected;
  const proceed = connected ? target.dispatchEvent(new MouseEvent('mousedown', init)) : true;
  if (proceed) {
    const focusable = connected ? target.closest<HTMLElement>(MOUSE_FOCUSABLE) : null;
    if (focusable)
      focusable.focus();
    else if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  }
  await tick();
  if (!target.isConnected)
    return;
  target.dispatchEvent(new PointerEvent('pointerup', { ...init, pointerId: 1, isPrimary: true }));
  target.dispatchEvent(new MouseEvent('mouseup', init));
  target.dispatchEvent(new MouseEvent(init.button === 2 ? 'contextmenu' : 'click', init));
  await tick();
}
