import type { KeyLike } from './enter-key.ts';

/** keydown 이벤트에서 쓰는 것. timeStamp는 이벤트의 timeStamp(ms)다. */
export interface TimedKeyLike extends KeyLike {
  timeStamp: number;
}

/** 칸의 IME 조합 상태. endedAt은 마지막 compositionend의 timeStamp이고, 아직 없으면 null이다. */
export interface CompositionState {
  composing: boolean;
  endedAt: number | null;
}

/**
 * compositionend와 같은 키 누름에서 온 Esc로 볼 시간 폭(ms). 사람이 조합을 끝내고 일부러 다시 누르는 Esc보다 짧다.
 * WebKit은 keydown 시각을 OS 키 시각으로 찍어 compositionend보다 앞설 수 있으므로 앞뒤 모두 이 폭 안이면 같은 누름으로 본다.
 */
export const COMPOSITION_ESCAPE_WINDOW_MS = 100;

/**
 * 조합을 끝내기만 하는 Esc인지. 그 Esc로는 입력칸을 비우거나(INPUT-04) 이름 바꾸기를 취소하지 않는다(INPUT-15).
 * 조합 중 Esc는 브라우저마다 다른 모양으로 온다.
 * - isComposing이 true이거나 keyCode가 229 (Chromium 등)
 * - compositionend 전에 isComposing false·keyCode 27 (조합 상태를 칸에서 따로 추적해 안다)
 * - compositionend 바로 뒤에 isComposing false·keyCode 27 (macOS WebKit의 한글 두벌식: 입력기가 글자를 확정하고 Esc를 넘긴다)
 */
export function isCompositionEscape(event: TimedKeyLike, composition: CompositionState): boolean {
  if (event.key !== 'Escape')
    return false;
  if (event.isComposing || event.keyCode === 229 || composition.composing)
    return true;
  return composition.endedAt !== null && Math.abs(event.timeStamp - composition.endedAt) <= COMPOSITION_ESCAPE_WINDOW_MS;
}

/** 칸 하나의 compositionstart·compositionend를 받아 조합 상태를 들고 있는다. */
export class CompositionTracker {
  #composing = false;
  #endedAt: number | null = null;

  get state(): CompositionState {
    return { composing: this.#composing, endedAt: this.#endedAt };
  }

  start(): void {
    this.#composing = true;
  }

  end(timeStamp: number): void {
    this.#composing = false;
    this.#endedAt = timeStamp;
  }

  /** 새 칸을 열었다. 지난 칸이 compositionend 없이 사라졌어도 조합 중으로 남지 않게 한다. */
  reset(): void {
    this.#composing = false;
    this.#endedAt = null;
  }

  /** 조합을 끝내기만 하는 Esc인지 (isCompositionEscape). */
  isEscape(event: TimedKeyLike): boolean {
    return isCompositionEscape(event, this.state);
  }
}
