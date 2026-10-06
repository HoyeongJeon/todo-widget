// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../testing/test-app.ts';
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
