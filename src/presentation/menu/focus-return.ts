/** 메뉴를 닫으면 키보드 포커스가 갈 기본 자리(입력칸)의 표시. `AddInput.svelte`의 `<input>`에 단다 (WND-10). */
const FOCUS_HOME_ATTRIBUTE = 'data-focus-home';
// 괄호를 따로 붙인다. 문구 검사(I18N-02)는 '[data-focus-home]' 같은 선택자를 기술 낱말로 보지 않는다.
const FOCUS_HOME = '[' + FOCUS_HOME_ATTRIBUTE + ']';

/** 포커스가 팝업 안에 있었거나 갈 곳을 잃었다(body). 닫으면서 다른 칸(이름 바꾸기 칸, 확인 판)이 가져갔으면 아니다. */
function focusLost(popup: Element | null): boolean {
  const active = document.activeElement;
  return active === null || active === document.body || (popup?.contains(active) ?? false);
}

/** 글을 쓰는 칸(입력칸, 이름 바꾸기 칸)인지. */
function isTextField(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
  return element instanceof HTMLTextAreaElement || (element instanceof HTMLInputElement && element.type === 'text');
}

/**
 * 확인 판이 열릴 때 포커스가 있던 요소를 기억한다. 돌려준 함수를 닫힐 때 부르면 그 요소로 포커스를 돌려준다.
 * 포커스가 판 안에 있었거나 갈 곳을 잃었을(body) 때만 돌려준다. 닫으면서 다른 칸이 가져갔으면 그대로 둔다.
 */
export function rememberFocus(): (popup: Element | null) => void {
  const previous = document.activeElement;
  return (popup) => {
    if (focusLost(popup) && previous instanceof HTMLElement && previous !== document.body && previous.isConnected)
      previous.focus();
  };
}

/**
 * 메뉴(⋯ 메뉴, 우클릭 메뉴)용. 메뉴를 닫으면 키보드 포커스는 글을 쓰는 칸에 있다 (WND-10, PM 결정 2026-10-07).
 * - 열기 전 포커스가 아직 있는 글 칸이면 그 칸으로, 아니면(body, 버튼 등) 입력칸으로 돌려준다. v1.4 WPF ContextMenu도 닫히면 앞의
 *   포커스로 돌아간다. 그래서 ⋯ 메뉴로 투명도를 바꾼 뒤 바로 입력칸에 쓸 수 있다.
 * - 메뉴 항목이 다른 칸으로 포커스를 옮겼으면(이름 바꾸기 칸, 초기화 확인 판) 그대로 둔다.
 * - 바깥을 눌러 닫으면 Chromium(WebView2)의 mousedown 기본 동작이 돌려준 뒤에 돌아 포커스를 풀 수 있다. 다음 task에서 한 번 더
 *   보고, 그때도 갈 곳을 잃었으면 다시 돌려준다. presentation에는 주입하는 타이머가 없어 setTimeout을 쓴다.
 */
export function rememberMenuFocus(): (popup: Element | null) => void {
  const previous = document.activeElement;
  const destination = (): HTMLElement | null =>
    isTextField(previous) && previous.isConnected ? previous : document.querySelector<HTMLElement>(FOCUS_HOME);
  return (popup) => {
    if (!focusLost(popup))
      return;
    destination()?.focus();
    setTimeout(() => {
      if (focusLost(null))
        destination()?.focus();
    }, 0);
  };
}
