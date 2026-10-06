import { fireEvent } from '@testing-library/svelte';

/** 기록한 이벤트 하나. input의 value는 그 이벤트 때 칸의 값이다. */
export type RecordedEvent =
  | { type: 'keydown' | 'keyup'; key: string; keyCode: number }
  | { type: 'beforeinput'; inputType: string; data: string }
  | { type: 'input'; inputType: string; data: string; value: string };

/**
 * macOS WKWebView(릴리스 빌드 8c93e18)에서 한글 두벌식으로 "보고서 쓰기"를 쓰고, "기"를 조합하는 중 Esc를 누른 기록
 * (PM 확인 2026-10-06 임시 계측 기록의 159~176번째 이벤트, 받은 순서 그대로. 설계 문서 13.2 IME Esc 줄).
 * composition 이벤트는 하나도 없다. 입력기 편집이 먼저 오고 그 키의 keydown(조합 중이면 keyCode 229)이 뒤에 온다.
 * Esc는 "기"를 insertReplacementText로 확정한 뒤 isComposing false·keyCode 27로 온다.
 */
export function koreanEscapeWhileComposing(prefix: string): RecordedEvent[] {
  return [
    { type: 'beforeinput', inputType: 'insertReplacementText', data: '쓰' },
    { type: 'input', inputType: 'insertReplacementText', data: '쓰', value: `${prefix}쓰` },
    { type: 'keydown', key: 'ㅡ', keyCode: 229 },
    { type: 'keyup', key: 'ㅡ', keyCode: 77 },
    { type: 'beforeinput', inputType: 'insertReplacementText', data: '쓱' },
    { type: 'input', inputType: 'insertReplacementText', data: '쓱', value: `${prefix}쓱` },
    { type: 'keydown', key: 'ㄱ', keyCode: 229 },
    { type: 'beforeinput', inputType: 'insertReplacementText', data: '쓰' },
    { type: 'input', inputType: 'insertReplacementText', data: '쓰', value: `${prefix}쓰` },
    { type: 'beforeinput', inputType: 'insertText', data: '기' },
    { type: 'input', inputType: 'insertText', data: '기', value: `${prefix}쓰기` },
    { type: 'keydown', key: 'ㅣ', keyCode: 229 },
    { type: 'keyup', key: 'ㄱ', keyCode: 82 },
    { type: 'keyup', key: 'ㅣ', keyCode: 76 },
    { type: 'beforeinput', inputType: 'insertReplacementText', data: '기' },
    { type: 'input', inputType: 'insertReplacementText', data: '기', value: `${prefix}쓰기` },
    { type: 'keydown', key: 'Escape', keyCode: 27 },
    { type: 'keyup', key: 'Escape', keyCode: 27 },
  ];
}

/**
 * 같은 기록에서 "서"를 조합하다 Space로 확정한 부분(29~35번째). 입력기가 "서"를 확정한 뒤 Space keydown(32)이 온다.
 * 이 뒤에는 조합 중인 글자가 없다.
 */
export function koreanSpaceAfterComposing(prefix: string): RecordedEvent[] {
  return [
    { type: 'beforeinput', inputType: 'insertReplacementText', data: '서' },
    { type: 'input', inputType: 'insertReplacementText', data: '서', value: `${prefix}서` },
    { type: 'keydown', key: ' ', keyCode: 32 },
    { type: 'beforeinput', inputType: 'insertText', data: ' ' },
    { type: 'input', inputType: 'insertText', data: ' ', value: `${prefix}서 ` },
    { type: 'keyup', key: ' ', keyCode: 32 },
  ];
}

/** 기록한 이벤트를 칸에 차례로 보낸다. */
export async function replay(field: HTMLInputElement | HTMLTextAreaElement, events: readonly RecordedEvent[]): Promise<void> {
  for (const event of events) {
    switch (event.type) {
      case 'keydown':
        await fireEvent.keyDown(field, { key: event.key, keyCode: event.keyCode });
        break;
      case 'keyup':
        await fireEvent.keyUp(field, { key: event.key, keyCode: event.keyCode });
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
