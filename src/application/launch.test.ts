import { beforeEach, describe, expect, it } from 'vitest';
import { FakeAutoStart } from '../testing/fake-auto-start.ts';
import { FakeClock } from '../testing/fake-clock.ts';
import { FakeDialog } from '../testing/fake-dialog.ts';
import { FakeProcess } from '../testing/fake-process.ts';
import { FakeTimer, flush } from '../testing/fake-timer.ts';
import { FakeUpdater } from '../testing/fake-updater.ts';
import { FakeWindowController } from '../testing/fake-window-controller.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { sequenceIds } from '../testing/sequence-ids.ts';
import { type LaunchResult, launchApp } from './launch.ts';
import { SETTINGS_FILE } from './settings/settings-repository.ts';
import { TASKS_FILE } from './storage/task-repository.ts';

let files: MemoryFileStore;
let clock: FakeClock;
let timer: FakeTimer;
let window: FakeWindowController;
let dialog: FakeDialog;
let process: FakeProcess;
let updater: FakeUpdater;
let autoStart: FakeAutoStart;
let wakes: Array<() => void>;

beforeEach(() => {
  files = new MemoryFileStore();
  clock = new FakeClock();
  timer = new FakeTimer(clock);
  window = new FakeWindowController();
  dialog = new FakeDialog();
  process = new FakeProcess();
  updater = new FakeUpdater();
  autoStart = new FakeAutoStart();
  wakes = [];
});

/** 읽기 다시 시도(STORE-20, 100ms 간격)가 끝나도록 시간을 조금씩 보낸다. 24시간 업데이트 예약은 실행되지 않는다. */
async function launch(): Promise<LaunchResult> {
  const result = launchApp({
    files,
    clock,
    timer,
    newId: sequenceIds(),
    autoStart,
    appInfo: { version: '2.0.0', isDevBuild: false },
    window,
    dialog,
    process,
    updater,
    watchWake: (onWake) => {
      wakes.push(onWake);
      return () => undefined;
    },
    texts: { appTitle: '할 일', cannotOpen: '할 일 파일을 열 수 없어요' },
  });
  for (let i = 0; i < 6; i++) {
    await flush();
    await timer.advance(100);
  }
  return result;
}

describe('앱 시작', () => {
  it('STORE-10 tasks.json을 읽지 못하면 창을 숨긴 채 대화 상자를 보이고, 확인하면 끝낸다', async () => {
    files.files.set(TASKS_FILE, '{"version":2,"tasks":[]}');
    files.unreadable.add(TASKS_FILE);
    expect(await launch()).toEqual({ kind: 'exited' });
    expect(window.keptHidden).toBe(true);
    expect(dialog.shown).toEqual([
      { title: '할 일', message: expect.stringMatching(/^할 일 파일을 열 수 없어요\n\/data\/tasks\.json\n.*읽지 못했어요/) },
    ]);
    expect(process.exits).toBe(1);
    expect(window.shown).toEqual([]);
    expect(autoStart.calls).toEqual([]);
  });

  it('STORE-10 시작 중 예상 못 한 오류도 같은 대화 상자로 알리고 끝낸다', async () => {
    files.read = async () => {
      throw new TypeError('버그');
    };
    expect(await launch()).toEqual({ kind: 'exited' });
    expect(dialog.shown[0]?.message).toContain('/data/tasks.json');
    expect(dialog.shown[0]?.message).toContain('버그');
    expect(process.exits).toBe(1);
  });

  it('WND-07 UPD-01 준비되면 창을 배치하고 업데이트를 확인하며 실행 중인 서비스를 돌려준다', async () => {
    const result = await launch();
    if (result.kind !== 'running')
      throw new Error('실행되지 않았어요');
    expect(window.current).toEqual({ left: 1576, top: 24, width: 320, height: 520 });
    expect(window.pinned).toBe(true);
    expect(updater.fetches).toBe(1);
    expect(result.session.items).toEqual([]);
    expect(result.autoStart.failed).toBe(false);
    expect(dialog.shown).toEqual([]);
  });

  it('START-08 OS가 종료를 청하면 위치를 저장하고 끝낸다', async () => {
    await launch();
    window.current = { left: 700, top: 300, width: 320, height: 520 };
    process.requestQuit();
    await flush();
    expect(process.exits).toBe(1);
    expect(JSON.parse(files.files.get(SETTINGS_FILE) ?? 'null')).toMatchObject({ left: 700, top: 300 });
  });

  it('UPD-01 잠자기에서 깨어났을 때 마지막 확인에서 24시간이 지났으면 바로 다시 확인한다', async () => {
    await launch();
    expect(wakes).toHaveLength(1);
    clock.setEpochMs(clock.now().toEpochMs() + 24 * 60 * 60 * 1000);
    wakes[0]?.();
    await flush();
    expect(updater.fetches).toBe(2);
  });
});
