import type { KeyLike } from './enter-key.ts';

/** 칸의 IME 상태. */
export interface CompositionState {
  /** compositionstart를 받고 아직 compositionend를 받지 않았다. */
  composing: boolean;
  /** 마지막 keydown 뒤에 입력기가 글자를 바꿔 넣었다(inputType `insertReplacementText`). 다음 keydown이 이 입력기 편집에서 왔다. */
  imeEdited: boolean;
  /** compositionend를 받았고 아직 keydown·keyup이 없다. 조합을 끝낸 그 키의 keydown이 곧 온다. */
  justEnded: boolean;
}

/**
 * 조합을 끝내기만 하는 Esc인지. 그 Esc로는 입력칸을 비우거나(INPUT-04) 이름 바꾸기를 취소하지 않는다(INPUT-15).
 * 조합 중 Esc는 엔진마다 다른 모양으로 온다.
 * - Chromium 등: keydown이 `isComposing: true`이거나 keyCode 229다.
 * - composition 이벤트를 보내는 엔진: compositionstart 뒤 compositionend 전에 온다.
 * - macOS WKWebView 한글 두벌식(PM 확인 기록, 2026-10-06): composition 이벤트가 하나도 없다. 조합 중 글자는
 *   `insertReplacementText` 입력으로 바뀌고, 그 키의 keydown은 입력이 끝난 **뒤에** 온다. Esc를 누르면 입력기가 조합 중 글자를
 *   `insertReplacementText`로 확정한 뒤 `isComposing: false, keyCode: 27`인 keydown이 온다. keydown의 timeStamp는 OS 키 시각이라
 *   입력보다 앞서므로 시각으로는 가를 수 없다. 그래서 "마지막 keydown 뒤 입력기 편집이 있었다"로 가른다.
 * - Windows WebView2 + MS 한글 IME(추정, 2026-10-07 Windows 확인에서 INPUT-04 실패·INPUT-06 통과로 미룸): 입력기가 조합 중 글자를
 *   확정하고(compositionend) Esc를 앱에 다시 넘긴다. 그래서 `isComposing: false, keyCode: 27`인 keydown이 compositionend **뒤에**,
 *   손을 떼는 keyup보다 앞서 온다. 그래서 "compositionend 뒤 아직 keydown·keyup이 없다"로 가른다. 사용자가 새로 누른 Esc는 그 사이에 keyup이 낀다.
 */
export function isCompositionEscape(event: KeyLike, state: CompositionState): boolean {
  if (event.key !== 'Escape')
    return false;
  return event.isComposing || event.keyCode === 229 || state.composing || state.imeEdited || state.justEnded;
}

/** 입력기가 조합 중 글자를 바꿔 넣은 입력인지. WKWebView 한글은 `insertReplacementText`, composition 이벤트를 쓰는 엔진은 `insertCompositionText`다. */
function isImeEdit(inputType: string): boolean {
  return inputType === 'insertReplacementText' || inputType === 'insertCompositionText';
}

/** 칸 하나의 composition 이벤트와 입력을 받아 IME 상태를 들고 있는다. */
export class CompositionTracker {
  #composing = false;
  #imeEdited = false;
  #justEnded = false;

  get state(): CompositionState {
    return { composing: this.#composing, imeEdited: this.#imeEdited, justEnded: this.#justEnded };
  }

  start(): void {
    this.#composing = true;
  }

  /**
   * compositionend. 조합이 끝나면 입력기 편집 표시를 지우고 "막 끝남" 표시를 켠다.
   * 조합을 끝낸 키(Esc·Enter·Space)는 WebView2 한글에서 이 뒤에 제 keyCode로 다시 온다. 그 keydown이나 손을 뗀 keyup이 표시를 지운다.
   */
  end(): void {
    this.#composing = false;
    this.#imeEdited = false;
    this.#justEnded = true;
  }

  /** beforeinput·input. */
  input(inputType: string): void {
    if (isImeEdit(inputType))
      this.#imeEdited = true;
  }

  /** keydown마다 부른다. 조합을 끝내기만 하는 Esc인지 돌려주고, 입력기 편집 표시와 "막 끝남" 표시를 지운다(그 편집·조합 끝은 이 키에서 왔다). */
  keydown(event: KeyLike): boolean {
    const escape = isCompositionEscape(event, this.state);
    this.#imeEdited = false;
    this.#justEnded = false;
    return escape;
  }

  /** keyup마다 부른다. 조합을 끝낸 키에서 손을 뗐다. 그 뒤 Esc는 새로 누른 것이다(Esc가 조합을 취소하고 IME가 먹은 경우 포함). */
  keyup(): void {
    this.#justEnded = false;
  }

  /** 새 칸을 열었거나 칸이 포커스를 잃었다. 지난 조합 상태를 잊는다. */
  reset(): void {
    this.#composing = false;
    this.#imeEdited = false;
    this.#justEnded = false;
  }
}
