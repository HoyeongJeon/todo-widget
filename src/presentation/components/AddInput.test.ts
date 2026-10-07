// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../testing/test-app.ts';
import { koreanEscapeWhileComposing, koreanSpaceAfterComposing, replay } from '../../testing/webkit-korean-ime.ts';
import {
  replayWebview2,
  webview2KoreanEnterAfterComposing,
  webview2KoreanEscapeWhileComposing,
  webview2KoreanSpaceAfterComposing,
} from '../../testing/webview2-korean-ime.ts';
import { createTranslator } from '../i18n/translator.ts';
import { WidgetViewModel } from '../widget-view-model.svelte.ts';
import AddInput from './AddInput.svelte';

afterEach(() => cleanup());

async function setup() {
  const test = await createTestApp();
  const vm = new WidgetViewModel({ app: test.app, t: createTranslator('ko'), report: () => undefined });
  const view = render(AddInput, { props: { vm } });
  const input = view.container.querySelector('input') as HTMLInputElement;
  const titles = (): string[] => test.app.session.items.map((item) => item.title);
  return { ...test, vm, input, titles };
}

describe('입력칸', () => {
  it('INPUT-01 입력칸이 비어 있으면 "할 일 추가"를 흐리게 보여 준다', async () => {
    const { input } = await setup();
    expect(input.placeholder).toBe('할 일 추가');
  });

  it('INPUT-02 Enter를 누르면 추가하고 입력칸을 비우며, 포커스는 입력칸에 남는다', async () => {
    const { input, titles } = await setup();
    input.focus();
    await fireEvent.input(input, { target: { value: '보고서 쓰기' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(titles()).toEqual(['보고서 쓰기']);
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('INPUT-03 빈 입력에서 Enter는 아무것도 하지 않고 입력칸 내용도 그대로다', async () => {
    const { input, titles } = await setup();
    await fireEvent.input(input, { target: { value: '   ' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(titles()).toEqual([]);
    expect(input.value).toBe('   ');
  });

  it('INPUT-04 Esc를 누르면 입력하던 글자를 지우고 아무것도 추가하지 않는다', async () => {
    const { input, titles } = await setup();
    await fireEvent.input(input, { target: { value: '보고서' } });
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect([input.value, titles()]).toEqual(['', []]);
  });

  it('INPUT-05 조합을 확정하는 Enter로는 추가하지 않고, 확정 뒤 Enter로 마지막 글자까지 정확히 하나 추가한다', async () => {
    const { input, titles } = await setup();
    await fireEvent.compositionStart(input);
    await fireEvent.input(input, { target: { value: '보고서 쓰' } });
    await fireEvent.input(input, { target: { value: '보고서 쓰기' } });
    await fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(titles()).toEqual([]);
    await fireEvent.compositionEnd(input);
    await fireEvent.keyDown(input, { key: 'Enter' });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(titles()).toEqual(['보고서 쓰기']);
    expect(input.value).toBe('');
  });

  it('INPUT-04 INPUT-05 조합을 끝내는 Esc(keyCode 229)는 입력칸을 비우지 않는다', async () => {
    const { input } = await setup();
    await fireEvent.input(input, { target: { value: '보고서 쓰기' } });
    await fireEvent.keyDown(input, { key: 'Escape', keyCode: 229 });
    expect(input.value).toBe('보고서 쓰기');
  });

  it('INPUT-04 IME 조합 중 Esc가 compositionend 전에 isComposing false·keyCode 27로 와도 입력칸을 비우지 않는다', async () => {
    const { input } = await setup();
    await fireEvent.compositionStart(input);
    await fireEvent.input(input, { target: { value: '보고서 쓰기' } });
    await fireEvent.keyDown(input, { key: 'Escape', keyCode: 27 });
    await fireEvent.compositionEnd(input);
    expect(input.value).toBe('보고서 쓰기');
  });

  it('INPUT-04 macOS WKWebView 한글: "기"를 조합하는 중 누른 Esc(기록한 이벤트 순서 그대로)는 입력칸을 비우지 않고, 한 번 더 누른 Esc는 비운다', async () => {
    const { input } = await setup();
    await fireEvent.input(input, { target: { value: '보고서 ㅆ' }, inputType: 'insertText', data: 'ㅆ' });
    await replay(input, koreanEscapeWhileComposing('보고서 '));
    expect(input.value).toBe('보고서 쓰기');
    await fireEvent.keyDown(input, { key: 'Escape', keyCode: 27 });
    expect(input.value).toBe('');
  });

  it('INPUT-04 macOS WKWebView 한글: Space로 조합을 끝낸 뒤 누른 Esc는 입력칸을 비운다', async () => {
    const { input } = await setup();
    await fireEvent.input(input, { target: { value: '보고서' }, inputType: 'insertText', data: '서' });
    await replay(input, koreanSpaceAfterComposing('보고'));
    await fireEvent.keyDown(input, { key: 'Escape', keyCode: 27 });
    expect(input.value).toBe('');
  });

  it.each([
    ['(A) Esc가 229로 한 번, compositionend 뒤 27로 또', true],
    ['(B) compositionend 뒤 27로 한 번', false],
  ])('INPUT-04 Windows WebView2 한글: "험"을 조합하는 중 누른 Esc(compositionend 뒤 keyCode 27)는 입력칸을 비우지 않고, 한 번 더 누른 Esc는 비운다 %s', async (_, leading229) => {
    const { input } = await setup();
    await fireEvent.input(input, { target: { value: '시' }, inputType: 'insertText', data: '시' });
    await replayWebview2(input, webview2KoreanEscapeWhileComposing('시', leading229));
    expect(input.value).toBe('시험');
    await fireEvent.keyDown(input, { key: 'Escape', code: 'Escape', keyCode: 27 });
    await fireEvent.keyUp(input, { key: 'Escape', code: 'Escape', keyCode: 27 });
    expect(input.value).toBe('');
  });

  it('INPUT-04 Windows WebView2 한글: Space로 조합을 끝낸 뒤 누른 Esc는 입력칸을 비운다', async () => {
    const { input } = await setup();
    await fireEvent.input(input, { target: { value: '시' }, inputType: 'insertText', data: '시' });
    await replayWebview2(input, webview2KoreanSpaceAfterComposing('시'));
    expect(input.value).toBe('시험 ');
    await fireEvent.keyDown(input, { key: 'Escape', code: 'Escape', keyCode: 27 });
    expect(input.value).toBe('');
  });

  it('INPUT-04 INPUT-05 Windows WebView2 한글: Enter로 확정해 추가한 뒤 누른 Esc는 다음 입력을 막지 않는다', async () => {
    const { input, titles } = await setup();
    await fireEvent.input(input, { target: { value: '시' }, inputType: 'insertText', data: '시' });
    await replayWebview2(input, webview2KoreanEnterAfterComposing('시'));
    expect([titles(), input.value]).toEqual([['시험'], '']);
    await fireEvent.input(input, { target: { value: '다음' }, inputType: 'insertText', data: '음' });
    await fireEvent.keyDown(input, { key: 'Escape', code: 'Escape', keyCode: 27 });
    expect([titles(), input.value]).toEqual([['시험'], '']);
  });

  it('INPUT-04 조합 중 포커스를 잃어 compositionend가 오지 않았어도, 다시 돌아와 누른 Esc는 입력칸을 비운다', async () => {
    const { input } = await setup();
    await fireEvent.compositionStart(input);
    await fireEvent.input(input, { target: { value: '보고서' } });
    await fireEvent.blur(input);
    await fireEvent.keyDown(input, { key: 'Escape', keyCode: 27 });
    expect(input.value).toBe('');
  });

  it('INPUT-07 여러 줄을 붙여 넣으면 줄마다 바로 추가하고, 쓰던 글자는 그대로 남는다', async () => {
    const { input, titles } = await setup();
    await fireEvent.input(input, { target: { value: '쓰던 글' } });
    const notPrevented = await fireEvent.paste(input, { clipboardData: { getData: () => '보고서\n\n- 장보기\n' } });
    expect(notPrevented).toBe(false);
    expect(titles()).toEqual(['보고서', '장보기']);
    expect(input.value).toBe('쓰던 글');
  });

  it('INPUT-10 한 줄 붙여넣기는 막지 않아 입력칸에 그대로 들어가고, 바로 추가하지 않는다', async () => {
    const { input, titles } = await setup();
    const notPrevented = await fireEvent.paste(input, { clipboardData: { getData: () => '보고서' } });
    expect(notPrevented).toBe(true);
    expect(titles()).toEqual([]);
  });
});
