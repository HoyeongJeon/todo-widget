import { describe, expect, it } from 'vitest';
import { SETTINGS_FILE } from '../application/settings/settings-repository.ts';
import { TASKS_FILE } from '../application/storage/task-repository.ts';
import type { TodoItem } from '../domain/todo-item.ts';
import { flush } from '../testing/fake-timer.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { createTestApp } from '../testing/test-app.ts';
import { createTranslator } from './i18n/translator.ts';
import { WidgetViewModel } from './widget-view-model.svelte.ts';

async function widget(options: { settings?: Record<string, unknown>; tasks?: string } = {}) {
  const files = new MemoryFileStore();
  if (options.settings)
    files.files.set(SETTINGS_FILE, JSON.stringify(options.settings));
  if (options.tasks)
    files.files.set(TASKS_FILE, options.tasks);
  const test = await createTestApp(files);
  const reports: string[] = [];
  const vm = new WidgetViewModel({ app: test.app, t: createTranslator('ko'), report: (action) => reports.push(action) });
  const id = (title: string): string => test.app.session.items.find((item) => item.title === title)?.id ?? '';
  return { ...test, vm, reports, id };
}

const titles = (items: readonly TodoItem[]): string[] => items.map((item) => item.title);
const writesOf = (files: MemoryFileStore, name: string): number => files.writes.filter((written) => written === name).length;

describe('목록 화면', () => {
  it('LIST-01 섹션은 끝낸 일, 할 일 순서이고 항목이 없는 섹션은 숨긴다', async () => {
    const { vm, app, id } = await widget();
    expect(vm.sections).toEqual([]);
    vm.add('보고서');
    expect(vm.sections).toEqual(['todo']);
    vm.add('장보기');
    app.session.setStatus(id('장보기'), 'done');
    expect(vm.sections).toEqual(['done', 'todo']);
    app.session.setStatus(id('보고서'), 'done');
    expect(vm.sections).toEqual(['done']);
  });

  it('LIST-06 남은 개수가 있으면 "N개 남음", 없으면 "모두 끝냈어요"', async () => {
    const { vm, app, id } = await widget();
    expect(vm.remainingText).toBe('모두 끝냈어요');
    vm.add('보고서\n장보기');
    expect(vm.remainingText).toBe('2개 남음');
    app.session.setStatus(id('장보기'), 'done');
    expect(vm.remainingText).toBe('1개 남음');
  });

  it('LIST-07 LIST-09 끝낸 일은 처음에 접혀 있고, 펼치면 "접기"가 보이며 바로 저장한다', async () => {
    const { vm, app } = await widget();
    expect([vm.doneExpanded, vm.doneToggleText]).toEqual([false, '펼치기']);
    vm.toggleDone();
    expect([vm.doneExpanded, vm.doneToggleText]).toEqual([true, '접기']);
    await flush();
    expect(app.settings.current.doneExpanded).toBe(true);
  });

  it('LIST-08 LIST-09 할 일은 처음에 펼쳐 있고 개수는 하는 중을 포함한다. 접으면 바로 저장한다', async () => {
    const { vm, app, id } = await widget();
    vm.add('보고서\n장보기');
    app.session.setStatus(id('장보기'), 'doing');
    expect(vm.todoExpanded).toBe(true);
    expect(titles(vm.todoItems)).toEqual(['장보기', '보고서']);
    vm.toggleTodo();
    await flush();
    expect([vm.todoExpanded, app.settings.current.todoExpanded]).toEqual([false, false]);
  });

  it('LIST-09 다음에 켤 때 저장된 접힘 상태를 그대로 쓴다', async () => {
    const { vm } = await widget({ settings: { doneExpanded: true, todoExpanded: false } });
    expect([vm.doneExpanded, vm.todoExpanded]).toEqual([true, false]);
  });

  it('LIST-10 할 일이 하나도 없으면 빈 목록이다', async () => {
    const { vm } = await widget();
    expect(vm.isEmpty).toBe(true);
    vm.add('보고서');
    expect(vm.isEmpty).toBe(false);
  });
});

describe('추가', () => {
  it('INPUT-02 INPUT-20 추가하면 true이고, 맨 앞 목록 기호 하나를 뗀다', async () => {
    const { vm } = await widget();
    expect(vm.add('- 은행 방문')).toBe(true);
    expect(vm.add('1. 분기 보고서')).toBe(true);
    expect(titles(vm.todoItems)).toEqual(['은행 방문', '1. 분기 보고서']);
  });

  it('INPUT-03 INPUT-20 빈 입력이나 기호뿐인 입력은 추가하지 않는다', async () => {
    const { vm } = await widget();
    expect(vm.add('   ')).toBe(false);
    expect(vm.add('-')).toBe(false);
    expect(vm.isEmpty).toBe(true);
  });

  it('INPUT-07 여러 줄은 줄마다 순서대로 추가하고, 빈 줄은 건너뛰며, 저장은 한 번이다', async () => {
    const { vm, app, files } = await widget();
    vm.add('보고서\n\n• 장보기\n');
    await app.session.whenSaved();
    expect(titles(vm.todoItems)).toEqual(['보고서', '장보기']);
    expect(writesOf(files, TASKS_FILE)).toBe(1);
  });
});

describe('할 일 조작', () => {
  it('INPUT-11 이름을 바꾸던 중 동그라미를 누르면 이름을 먼저 저장하고 상태를 바꾼다', async () => {
    const { vm, app, id } = await widget();
    vm.add('초안');
    const target = id('초안');
    vm.startRename(target);
    vm.updateDraft('보고서');
    vm.cycle(target);
    expect(vm.renaming).toBeNull();
    expect(app.session.items[0]).toMatchObject({ title: '보고서', status: 'doing' });
  });

  it('INPUT-12 우클릭 메뉴는 할 일·하는 중·끝낸 일 중 지금 상태에 체크하고, 고르면 그 상태로 바꾸고 닫힌다', async () => {
    const { vm, app, id } = await widget();
    vm.add('장보기');
    const target = id('장보기');
    vm.openContextMenu(target, 40, 80);
    expect(vm.contextMenu).toEqual({ itemId: target, x: 40, y: 80 });
    expect(vm.statusChoices(target)).toEqual([
      { status: 'todo', label: '할 일', checked: true },
      { status: 'doing', label: '하는 중', checked: false },
      { status: 'done', label: '끝낸 일', checked: false },
    ]);
    vm.setStatus(target, 'done');
    expect(vm.contextMenu).toBeNull();
    expect(app.session.items[0]?.status).toBe('done');
    expect(vm.statusChoices(target).map((choice) => choice.checked)).toEqual([false, false, true]);
  });

  it('INPUT-12 우클릭 메뉴를 열면 ⋯ 메뉴와 확인 판은 닫힌다', async () => {
    const { vm, id } = await widget();
    vm.add('장보기');
    await vm.openMoreMenu();
    vm.openContextMenu(id('장보기'), 0, 0);
    expect([vm.menu.open, vm.contextMenu !== null]).toEqual([false, true]);
    vm.closeContextMenu();
    vm.openReset();
    expect(vm.confirmingReset).toBe(true);
    vm.openContextMenu(id('장보기'), 0, 0);
    expect([vm.confirmingReset, vm.contextMenu !== null]).toEqual([false, true]);
  });

  it('INPUT-13 이름 바꾸기를 시작하면 지금 제목으로 칸을 열고 우클릭 메뉴를 닫는다', async () => {
    const { vm, id } = await widget();
    vm.add('초안');
    vm.openContextMenu(id('초안'), 0, 0);
    vm.startRename(id('초안'));
    expect(vm.renaming).toEqual({ id: id('초안'), draft: '초안' });
    expect(vm.contextMenu).toBeNull();
  });

  it('INPUT-14 정리 규칙으로 저장하고, 두 번 불러도 한 번만 저장한다', async () => {
    const { vm, app, files, id } = await widget();
    vm.add('초안');
    await app.session.whenSaved();
    const before = writesOf(files, TASKS_FILE);
    vm.startRename(id('초안'));
    vm.commitRename('  보고서\n초안  ');
    vm.commitRename('다른 제목');
    await app.session.whenSaved();
    expect(titles(vm.todoItems)).toEqual(['보고서 초안']);
    expect(writesOf(files, TASKS_FILE)).toBe(before + 1);
  });

  it('INPUT-14 정리한 뒤 빈 제목이면 바뀌지 않고 칸이 닫힌다', async () => {
    const { vm, id } = await widget();
    vm.add('초안');
    vm.startRename(id('초안'));
    vm.commitRename('   ');
    expect([vm.renaming, titles(vm.todoItems)]).toEqual([null, ['초안']]);
  });

  it('INPUT-15 취소하면 입력한 내용을 버리고 저장하지 않는다', async () => {
    const { vm, app, files, id } = await widget();
    vm.add('초안');
    await app.session.whenSaved();
    const before = files.writes.length;
    vm.startRename(id('초안'));
    vm.updateDraft('보고서');
    vm.cancelRename();
    await app.session.whenSaved();
    expect([vm.renaming, titles(vm.todoItems), files.writes.length]).toEqual([null, ['초안'], before]);
  });

  it('INPUT-17 삭제는 확인 없이 바로 지운다', async () => {
    const { vm, id } = await widget();
    vm.add('장보기\n보고서');
    vm.openContextMenu(id('장보기'), 0, 0);
    vm.remove(id('장보기'));
    expect([titles(vm.todoItems), vm.contextMenu]).toEqual([['보고서'], null]);
  });
});

describe('초기화', () => {
  it('INPUT-18 확인 판에 전체 개수를 묻고, 취소하면 그대로, 모두 지우기를 누르면 상태와 관계없이 지운다', async () => {
    const { vm, app, files, id } = await widget();
    vm.add('보고서\n장보기\n은행');
    app.session.setStatus(id('은행'), 'done');
    await flush();
    const settingsBefore = writesOf(files, SETTINGS_FILE);
    vm.openReset();
    expect([vm.confirmingReset, vm.resetQuestion]).toEqual([true, '할 일 3개를 모두 지울까요?']);
    vm.cancelReset();
    expect([vm.confirmingReset, vm.itemCount]).toEqual([false, 3]);
    vm.openReset();
    vm.confirmReset();
    await flush();
    expect([vm.confirmingReset, vm.itemCount]).toEqual([false, 0]);
    expect(writesOf(files, SETTINGS_FILE)).toBe(settingsBefore);
  });

  it('INPUT-18 ⋯ 메뉴의 초기화를 누르면 메뉴를 닫고 확인 판을 연다', async () => {
    const { vm } = await widget();
    vm.add('보고서');
    await vm.openMoreMenu();
    vm.menu.reset();
    expect([vm.menu.open, vm.confirmingReset]).toEqual([false, true]);
  });

  it('INPUT-19 할 일이 없으면 초기화를 고를 수 없고 확인 판도 열리지 않는다', async () => {
    const { vm } = await widget();
    expect(vm.menu.resetEnabled).toBe(false);
    vm.openReset();
    expect(vm.confirmingReset).toBe(false);
    vm.add('보고서');
    expect(vm.menu.resetEnabled).toBe(true);
  });
});

describe('📌', () => {
  it('WND-09 누르면 맨 위 고정을 바꿔 저장하고, 툴팁도 바뀐다', async () => {
    const { vm, window, app } = await widget();
    expect([vm.pinned, vm.pinTooltip]).toEqual([true, '맨 위 고정 끄기']);
    await vm.togglePin();
    expect([vm.pinned, vm.pinTooltip, window.pinned, app.settings.current.pinned]).toEqual([false, '맨 위에 고정', false, false]);
  });

  it('WND-09 창에 적용하지 못하면 표시를 되돌린다', async () => {
    const { vm, window, reports, app } = await widget();
    window.failPinned = true;
    await vm.togglePin();
    expect([vm.pinned, app.settings.current.pinned, reports]).toEqual([true, true, ['pin']]);
  });
});

describe('안내 줄', () => {
  it('START-09 할 일 저장 실패를 안내 줄에 보인다', async () => {
    const { vm, app, files } = await widget();
    files.failWrites = true;
    vm.add('보고서');
    await app.session.whenSaved();
    expect(vm.notice).toEqual({ messages: ['저장하지 못했어요. 다음 변경 때 다시 시도해요'], action: null });
  });

  it('START-05 자동 실행을 바꾸지 못하면 안내 줄에 보이고, 체크는 실제 상태다', async () => {
    const { vm, autoStart } = await widget();
    autoStart.failEnable = true;
    await vm.openMoreMenu();
    await vm.menu.toggleAutoStart();
    expect(vm.menu.autoStartChecked).toBe(false);
    expect(vm.notice).toEqual({ messages: ['자동 실행 설정을 바꾸지 못했어요'], action: null });
  });

  it('UPD-03 새 버전이 있으면 "새 버전이 있어요"와 누를 수 있는 "업데이트"를 보인다', async () => {
    const { vm, app } = await widget();
    expect(vm.notice).toBeNull();
    await app.updates.check();
    expect(vm.notice).toEqual({ messages: ['새 버전이 있어요'], action: '업데이트' });
  });

  it('UPD-04 UPD-07 누르면 설치하는 동안 다시 누를 수 없고, 실패하면 다시 시도할 수 있다', async () => {
    const { vm, app, updater } = await widget();
    await app.updates.check();
    updater.failInstall = new Error('받지 못했어요');
    vm.installUpdate();
    expect(vm.notice).toEqual({ messages: ['업데이트하는 중이에요'], action: null });
    await flush();
    expect(vm.notice).toEqual({ messages: ['업데이트하지 못했어요'], action: '업데이트' });
    expect(updater.installs).toBe(1);
  });

  it('START-09 UPD-03 새 버전에서 만든 파일이면 그 안내 옆에 업데이트 버튼을 함께 보인다', async () => {
    const { vm, app } = await widget({ tasks: '{"version":3,"tasks":[]}' });
    expect(vm.notice).toEqual({ messages: ['새 버전에서 만든 파일이에요. 업데이트해 주세요'], action: null });
    await app.updates.check();
    expect(vm.notice).toEqual({ messages: ['새 버전에서 만든 파일이에요. 업데이트해 주세요'], action: '업데이트' });
  });
});

describe('창과 메뉴', () => {
  it('WND-10 메뉴와 확인 판은 한 번에 하나만 열리고, 창이 포커스를 잃으면 모두 닫힌다', async () => {
    const { vm } = await widget();
    vm.add('보고서');
    await vm.openMoreMenu();
    expect(vm.anyPopupOpen).toBe(true);
    vm.closePopups();
    expect([vm.anyPopupOpen, vm.menu.open, vm.contextMenu, vm.confirmingReset]).toEqual([false, false, null, false]);
  });

  it('WND-03 크기를 바꾸기 시작하면 열린 메뉴를 닫고 이름 바꾸기를 저장한다', async () => {
    const { vm, id } = await widget();
    vm.add('초안');
    await vm.menu.show();
    vm.startRename(id('초안'));
    vm.updateDraft('보고서');
    expect(vm.menu.open).toBe(true);
    await vm.startResize('East', { screenX: 0, screenY: 0 });
    expect([vm.menu.open, vm.renaming, titles(vm.todoItems)]).toEqual([false, null, ['보고서']]);
  });

  it('INPUT-18 WND-03 초기화 확인 판이 열려 있으면 가장자리를 눌러도 크기 조절을 시작하지 않고 판만 닫는다', async () => {
    const { vm, window } = await widget();
    vm.add('보고서');
    vm.openReset();
    await vm.startResize('South', { screenX: 0, screenY: 0 });
    expect([window.resizeCalls.length, vm.confirmingReset, vm.window.resizing]).toEqual([0, false, false]);
  });

  it('WND-02 정리하면 창 이동 신호와 서비스 알림을 그만 받는다', async () => {
    const { vm, window } = await widget();
    expect(window.movedListeners).toBe(1);
    vm.dispose();
    expect(window.movedListeners).toBe(0);
  });
});
