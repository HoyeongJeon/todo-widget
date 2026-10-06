/** keydown 이벤트에서 쓰는 것. */
export interface KeyLike {
  key: string;
  isComposing: boolean;
  keyCode: number;
}

/**
 * 할 일 추가·이름 저장에 쓸 Enter인지. IME 조합을 확정하는 Enter(isComposing, 또는 keyCode 229)는 쓰지 않는다.
 * 조합을 확정한 뒤 OS가 Enter를 한 번 더 보내면 그것을, 보내지 않으면 사용자가 다시 누른 Enter를 쓴다.
 * 어느 쪽이든 정확히 한 번이다 (INPUT-05, INPUT-14).
 */
export function isCommitEnter(event: KeyLike): boolean {
  return event.key === 'Enter' && !event.isComposing && event.keyCode !== 229;
}
