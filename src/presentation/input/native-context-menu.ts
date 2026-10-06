/** 글을 쓰는 input 종류. 빈 값이나 모르는 값은 브라우저가 `text`로 읽는다. */
const TEXT_INPUT_TYPES: ReadonlySet<string> = new Set(['text', 'search', 'url', 'email', 'password']);

/**
 * 이 자리에서 OS 기본 우클릭 메뉴(잘라내기·복사·붙여넣기)를 그대로 둘지. 글을 쓰는 칸만 허용한다 (D25, INPUT-12).
 * 투명도 슬라이더(`range`) 같은 다른 칸에서는 WebView 기본 메뉴("다시 로드" 등)가 뜨지 않게 막는다.
 */
export function allowsNativeContextMenu(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement)
    return true;
  return target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type);
}
