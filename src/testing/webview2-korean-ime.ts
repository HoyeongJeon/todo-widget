import { fireEvent } from '@testing-library/svelte';

/** 기록(또는 추정)한 이벤트 하나. input의 value는 그 이벤트 때 칸의 값이다. */
export type Webview2Event =
  | { type: 'keydown'; key: string; code: string; keyCode: number; isComposing: boolean }
  | { type: 'keyup'; key: string; code: string; keyCode: number }
  | { type: 'compositionstart' | 'compositionupdate' | 'compositionend'; data: string }
  | { type: 'beforeinput'; inputType: string; data: string }
  | { type: 'input'; inputType: string; data: string; value: string };

/*
 * Windows WebView2(Chromium) + Microsoft 한글 IME의 이벤트 순서. **추정이다(PM 계측으로 확인 전, 2026-10-07).**
 * 근거: Windows 확인에서 조합 중 Esc가 입력칸을 바로 비웠고(INPUT-04 실패), 조합 중 Enter는 정확히 하나만 추가했다(INPUT-06 통과).
 * 그러면 조합을 끝낸 키가 compositionend **뒤에** `isComposing:false`와 제 keyCode(Esc 27, Enter 13)로 다시 와야 한다.
 * 조사 기록: .superpowers/sdd/2026-10-07-v2-release/windows-bugs-investigation.md 1장. 실제 기록을 받으면 이 파일을 그것으로 바꾼다.
 */

/** "시"까지 쓴 칸에서 "험"을 조합한다(ㅎ·ㅓ·ㅁ). 조합 중 글자는 insertCompositionText로 바뀐다. */
function composeHeom(prefix: string): Webview2Event[] {
  return [
    { type: 'keydown', key: 'Process', code: 'KeyG', keyCode: 229, isComposing: false }, // ㅎ
    { type: 'compositionstart', data: '' },
    { type: 'compositionupdate', data: 'ㅎ' },
    { type: 'beforeinput', inputType: 'insertCompositionText', data: 'ㅎ' },
    { type: 'input', inputType: 'insertCompositionText', data: 'ㅎ', value: `${prefix}ㅎ` },
    { type: 'keyup', key: 'ㅎ', code: 'KeyG', keyCode: 71 },
    { type: 'keydown', key: 'Process', code: 'KeyJ', keyCode: 229, isComposing: true }, // ㅓ
    { type: 'compositionupdate', data: '허' },
    { type: 'beforeinput', inputType: 'insertCompositionText', data: '허' },
    { type: 'input', inputType: 'insertCompositionText', data: '허', value: `${prefix}허` },
    { type: 'keyup', key: 'ㅓ', code: 'KeyJ', keyCode: 74 },
    { type: 'keydown', key: 'Process', code: 'KeyA', keyCode: 229, isComposing: true }, // ㅁ
    { type: 'compositionupdate', data: '험' },
    { type: 'beforeinput', inputType: 'insertCompositionText', data: '험' },
    { type: 'input', inputType: 'insertCompositionText', data: '험', value: `${prefix}험` },
    { type: 'keyup', key: 'ㅁ', code: 'KeyA', keyCode: 65 },
  ];
}

/**
 * "험"을 조합하는 중 Esc. 입력기가 "험"을 확정하고(compositionend) Esc를 앱에 다시 넘긴다.
 * - 순서 (A) `leading229 = true`: Esc keydown이 먼저 keyCode 229(`isComposing:true`)로 한 번 오고, compositionend 뒤 keyCode 27로 또 온다.
 * - 순서 (B) `leading229 = false`: compositionend 뒤 keyCode 27로 한 번만 온다.
 * 두 경우 모두 그 사이에 keyup이 없다. 손을 떼는 keyup은 맨 끝에 온다.
 */
export function webview2KoreanEscapeWhileComposing(prefix: string, leading229: boolean): Webview2Event[] {
  return [
    ...composeHeom(prefix),
    ...(leading229 ? [{ type: 'keydown', key: 'Process', code: 'Escape', keyCode: 229, isComposing: true } as const] : []),
    { type: 'compositionend', data: '험' },
    { type: 'keydown', key: 'Escape', code: 'Escape', keyCode: 27, isComposing: false },
    { type: 'keyup', key: 'Escape', code: 'Escape', keyCode: 27 },
  ];
}

/** "험"을 조합하다 Space로 확정한다. compositionend 뒤 Space keydown(32)이 오고 공백이 들어간다. */
export function webview2KoreanSpaceAfterComposing(prefix: string): Webview2Event[] {
  return [
    ...composeHeom(prefix),
    { type: 'keydown', key: 'Process', code: 'Space', keyCode: 229, isComposing: true },
    { type: 'compositionend', data: '험' },
    { type: 'keydown', key: ' ', code: 'Space', keyCode: 32, isComposing: false },
    { type: 'beforeinput', inputType: 'insertText', data: ' ' },
    { type: 'input', inputType: 'insertText', data: ' ', value: `${prefix}험 ` },
    { type: 'keyup', key: ' ', code: 'Space', keyCode: 32 },
  ];
}

/** "험"을 조합하다 Enter로 확정한다. compositionend 뒤 Enter keydown(13)이 한 번 온다(Windows INPUT-06 통과와 맞는다). */
export function webview2KoreanEnterAfterComposing(prefix: string): Webview2Event[] {
  return [
    ...composeHeom(prefix),
    { type: 'keydown', key: 'Process', code: 'Enter', keyCode: 229, isComposing: true },
    { type: 'compositionend', data: '험' },
    { type: 'keydown', key: 'Enter', code: 'Enter', keyCode: 13, isComposing: false },
    { type: 'keyup', key: 'Enter', code: 'Enter', keyCode: 13 },
  ];
}

/** 이벤트를 칸에 차례로 보낸다. */
export async function replayWebview2(field: HTMLInputElement | HTMLTextAreaElement, events: readonly Webview2Event[]): Promise<void> {
  for (const event of events) {
    switch (event.type) {
      case 'keydown':
        await fireEvent.keyDown(field, { key: event.key, code: event.code, keyCode: event.keyCode, isComposing: event.isComposing });
        break;
      case 'keyup':
        await fireEvent.keyUp(field, { key: event.key, code: event.code, keyCode: event.keyCode });
        break;
      case 'compositionstart':
        await fireEvent.compositionStart(field, { data: event.data });
        break;
      case 'compositionupdate':
        await fireEvent.compositionUpdate(field, { data: event.data });
        break;
      case 'compositionend':
        await fireEvent.compositionEnd(field, { data: event.data });
        break;
      case 'beforeinput':
        await fireEvent(field, new InputEvent('beforeinput', { inputType: event.inputType, data: event.data, bubbles: true, cancelable: true }));
        break;
      case 'input':
        await fireEvent.input(field, { target: { value: event.value }, inputType: event.inputType, data: event.data });
        break;
    }
  }
}
