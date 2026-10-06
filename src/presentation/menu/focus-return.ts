/**
 * 메뉴·확인 판이 열릴 때 포커스가 있던 요소를 기억한다. 돌려준 함수를 닫힐 때 부르면 그 요소로 포커스를 돌려준다.
 * 포커스가 팝업 안에 있었거나 갈 곳을 잃었을(body) 때만 돌려준다. 닫으면서 다른 칸(이름 바꾸기 칸, 확인 판)이 가져갔으면 그대로 둔다.
 * v1.4 WPF ContextMenu도 닫히면 앞의 포커스로 돌아간다. 그래서 ⋯ 메뉴로 투명도를 바꾼 뒤 바로 입력칸에 쓸 수 있다.
 */
export function rememberFocus(): (popup: Element | null) => void {
  const previous = document.activeElement;
  return (popup) => {
    const active = document.activeElement;
    const lost = active === null || active === document.body || (popup?.contains(active) ?? false);
    if (lost && previous instanceof HTMLElement && previous !== document.body && previous.isConnected)
      previous.focus();
  };
}
