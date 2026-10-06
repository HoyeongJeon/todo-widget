// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TASKS_FILE } from '../../application/storage/task-repository.ts';
import { createTestApp } from '../../testing/test-app.ts';
import { createTranslator } from '../i18n/translator.ts';
import { WidgetViewModel } from '../widget-view-model.svelte.ts';
import TaskRow from './TaskRow.svelte';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function setup(title = '초안') {
  const test = await createTestApp();
  test.app.session.add(title);
  await test.app.session.whenSaved();
  const vm = new WidgetViewModel({ app: test.app, t: createTranslator('ko'), report: () => undefined });
  const item = test.app.session.items[0];
  if (!item)
    throw new Error('할 일이 없어요');
  const view = render(TaskRow, { props: { vm, item } });
  const field = (): HTMLTextAreaElement | null => view.container.querySelector('textarea');
  const startRename = async (): Promise<HTMLTextAreaElement> => {
    await fireEvent.dblClick(view.container.querySelector('.text') as HTMLElement);
    const opened = field();
    if (!opened)
      throw new Error('이름 바꾸기 칸이 없어요');
    return opened;
  };
  const current = () => test.app.session.items[0];
  const taskWrites = () => test.files.writes.filter((name) => name === TASKS_FILE).length;
  return { ...test, vm, view, field, startRename, current, taskWrites };
}

describe('할 일 줄', () => {
  it('INPUT-11 동그라미를 누르면 상태가 한 단계 바뀌고, 툴팁은 "상태 바꾸기"다', async () => {
    const { view, current } = await setup();
    const mark = view.container.querySelector('.mark') as HTMLButtonElement;
    expect(mark.title).toBe('상태 바꾸기');
    await fireEvent.click(mark);
    expect(current()?.status).toBe('doing');
  });

  it('INPUT-11 이름을 바꾸던 중 동그라미를 누르면 이름을 먼저 저장한다', async () => {
    const { view, startRename, current } = await setup();
    const field = await startRename();
    await fireEvent.input(field, { target: { value: '보고서' } });
    await fireEvent.click(view.container.querySelector('.mark') as HTMLButtonElement);
    expect(current()).toMatchObject({ title: '보고서', status: 'doing' });
  });

  it('INPUT-13 제목을 더블클릭하면 이름 바꾸기 칸이 열려 포커스를 받고 글자 전체가 선택된다', async () => {
    const { startRename } = await setup();
    const field = await startRename();
    expect(document.activeElement).toBe(field);
    expect([field.value, field.selectionStart, field.selectionEnd]).toEqual(['초안', 0, 2]);
  });

  it('INPUT-14 Enter로 저장하고, Enter와 포커스 이탈이 같이 일어나도 한 번만 저장한다', async () => {
    const { startRename, field, current, app, taskWrites } = await setup();
    const before = taskWrites();
    const opened = await startRename();
    await fireEvent.input(opened, { target: { value: '보고서 초안' } });
    await fireEvent.keyDown(opened, { key: 'Enter' });
    await fireEvent.blur(opened);
    await app.session.whenSaved();
    expect([current()?.title, field(), taskWrites()]).toEqual(['보고서 초안', null, before + 1]);
  });

  it('INPUT-14 조합 중 Enter로는 저장하지 않고, 확정 뒤 Enter로 마지막 글자까지 저장한다', async () => {
    const { startRename, current } = await setup();
    const opened = await startRename();
    await fireEvent.compositionStart(opened);
    await fireEvent.input(opened, { target: { value: '보고서 쓰기' } });
    await fireEvent.keyDown(opened, { key: 'Enter', isComposing: true });
    expect(current()?.title).toBe('초안');
    await fireEvent.compositionEnd(opened);
    await fireEvent.keyDown(opened, { key: 'Enter' });
    expect(current()?.title).toBe('보고서 쓰기');
  });

  it('INPUT-14 다른 곳을 클릭해 포커스가 떠나면 저장한다', async () => {
    const { startRename, current } = await setup();
    const opened = await startRename();
    await fireEvent.input(opened, { target: { value: '보고서' } });
    await fireEvent.blur(opened);
    expect(current()?.title).toBe('보고서');
  });

  it('INPUT-14 정리한 뒤 빈 제목이면 원래 제목으로 돌아간다', async () => {
    const { startRename, current, field, view } = await setup();
    const opened = await startRename();
    await fireEvent.input(opened, { target: { value: '   ' } });
    await fireEvent.keyDown(opened, { key: 'Enter' });
    expect([current()?.title, field(), view.container.querySelector('.text')?.textContent]).toEqual(['초안', null, '초안']);
  });

  it('INPUT-15 Esc를 누르면 입력한 내용을 버리고 저장하지 않는다', async () => {
    const { startRename, current, field, taskWrites } = await setup();
    const before = taskWrites();
    const opened = await startRename();
    await fireEvent.input(opened, { target: { value: '보고서' } });
    await fireEvent.keyDown(opened, { key: 'Escape' });
    expect([current()?.title, field(), taskWrites()]).toEqual(['초안', null, before]);
  });

  it('INPUT-15 INPUT-05 조합을 끝내는 Esc(keyCode 229)는 이름 바꾸기를 취소하지 않는다', async () => {
    const { startRename, field, vm } = await setup();
    const opened = await startRename();
    await fireEvent.input(opened, { target: { value: '보고서' } });
    await fireEvent.keyDown(opened, { key: 'Escape', keyCode: 229 });
    expect([field()?.value, vm.renaming?.draft]).toEqual(['보고서', '보고서']);
  });

  it('INPUT-15 IME 조합 중 Esc가 compositionend 전에 isComposing false·keyCode 27로 와도 이름 바꾸기를 취소하지 않는다', async () => {
    const { startRename, field, vm } = await setup();
    const opened = await startRename();
    await fireEvent.compositionStart(opened);
    await fireEvent.input(opened, { target: { value: '보고서' } });
    await fireEvent.keyDown(opened, { key: 'Escape', keyCode: 27 });
    await fireEvent.compositionEnd(opened);
    expect([field()?.value, vm.renaming?.draft]).toEqual(['보고서', '보고서']);
  });

  it('INPUT-15 IME 조합 중 Esc가 compositionend 바로 뒤에 keyCode 27로 와도(WebKit) 취소하지 않고, 조합이 아닐 때 Esc는 취소한다', async () => {
    const { startRename, field, vm, current } = await setup();
    const opened = await startRename();
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    await fireEvent.compositionStart(opened);
    await fireEvent.input(opened, { target: { value: '보고서' } });
    await fireEvent.compositionEnd(opened);
    await fireEvent.keyDown(opened, { key: 'Escape', keyCode: 27 });
    expect([field()?.value, vm.renaming?.draft]).toEqual(['보고서', '보고서']);
    now.mockReturnValue(2000);
    await fireEvent.keyDown(opened, { key: 'Escape', keyCode: 27 });
    expect([field(), vm.renaming, current()?.title]).toEqual([null, null, '초안']);
  });

  it('INPUT-16 여러 줄을 붙여 넣으면 한 줄로 합쳐 커서 자리에 넣고, 커서를 그 뒤에 두며, 바로 추가하지 않는다', async () => {
    const { startRename, app, field } = await setup();
    const opened = await startRename();
    opened.setSelectionRange(2, 2);
    const notPrevented = await fireEvent.paste(opened, { clipboardData: { getData: () => 'A\nB' } });
    expect(notPrevented).toBe(false);
    expect([opened.value, opened.selectionStart]).toEqual(['초안A B', 5]);
    expect([app.session.items.length, field()]).toEqual([1, opened]);
  });

  it('INPUT-12 이름 바꾸기 중에 우클릭하면 할 일 메뉴를 열지 않고 OS 기본 메뉴를 둔다', async () => {
    const { startRename, vm } = await setup();
    const opened = await startRename();
    const notPrevented = await fireEvent.contextMenu(opened);
    expect([notPrevented, vm.contextMenu, vm.renaming !== null]).toEqual([true, null, true]);
  });

  it('INPUT-14 칸에 줄바꿈을 넣는 입력은 막는다', async () => {
    const { startRename } = await setup();
    const opened = await startRename();
    const event = new InputEvent('beforeinput', { inputType: 'insertLineBreak', cancelable: true, bubbles: true });
    opened.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
