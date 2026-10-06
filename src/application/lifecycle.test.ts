import { beforeEach, describe, expect, it } from 'vitest';
import { FakeClock } from '../testing/fake-clock.ts';
import { FakeProcess } from '../testing/fake-process.ts';
import { FakeWindowController } from '../testing/fake-window-controller.ts';
import { ManualTimer } from '../testing/manual-timer.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { sequenceIds } from '../testing/sequence-ids.ts';
import { AppLifecycle } from './lifecycle.ts';
import { SETTINGS_FILE, SettingsRepository } from './settings/settings-repository.ts';
import { SettingsService } from './settings/settings-service.ts';
import { TASKS_FILE, TaskRepository } from './storage/task-repository.ts';
import { TodoSession } from './todo-session.ts';
import { WindowPlacement } from './window-placement.ts';

let files: MemoryFileStore;
let window: FakeWindowController;
let process: FakeProcess;

beforeEach(() => {
  files = new MemoryFileStore();
  window = new FakeWindowController();
  process = new FakeProcess();
});

async function lifecycle(): Promise<{ lifecycle: AppLifecycle; session: TodoSession }> {
  const clock = new FakeClock();
  const session = await TodoSession.open(new TaskRepository(files, clock), clock, sequenceIds());
  const settings = await SettingsService.open(new SettingsRepository(files));
  const placement = new WindowPlacement({ window, settings, timer: new ManualTimer() });
  return { lifecycle: new AppLifecycle({ session, placement, process }), session };
}

describe('앱 수명', () => {
  it('START-08 WND-14 종료하면 창 위치를 설정에 저장하고, 할 일 저장이 끝난 뒤 프로세스를 끝낸다', async () => {
    const { lifecycle: app, session } = await lifecycle();
    let releaseWrite: () => void = () => undefined;
    files.writeGate = new Promise((resolve) => {
      releaseWrite = resolve;
    });
    session.add('보고서');
    window.current = { left: 640, top: 480, width: 320, height: 520 };
    const quitting = app.quit();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(process.exits).toBe(0);
    releaseWrite();
    await quitting;
    expect(process.exits).toBe(1);
    expect(JSON.parse(files.files.get(SETTINGS_FILE) ?? 'null')).toMatchObject({ left: 640, top: 480 });
    expect(files.files.get(TASKS_FILE)).toContain('보고서');
  });

  it('WND-14 설정이나 할 일 저장에 실패해도 그대로 끝낸다', async () => {
    const { lifecycle: app, session } = await lifecycle();
    files.failWrites = true;
    session.add('보고서');
    await app.quit();
    expect(process.exits).toBe(1);
  });

  it('START-08 여러 번 눌러도 한 번만 끝낸다', async () => {
    const { lifecycle: app } = await lifecycle();
    await Promise.all([app.quit(), app.quit()]);
    expect(process.exits).toBe(1);
  });

  it('START-08 끝내기에 실패하면 다시 눌러 끝낼 수 있다', async () => {
    const { lifecycle: app } = await lifecycle();
    process.failExit = true;
    await expect(app.quit()).rejects.toThrow('끝내지 못했어요');
    process.failExit = false;
    await app.quit();
    expect(process.exits).toBe(2);
  });

  it('UPD-04 다시 띄우기 전 준비는 종료처럼 저장하지만 프로세스를 끝내지 않는다', async () => {
    const { lifecycle: app } = await lifecycle();
    window.current = { left: 10, top: 20, width: 320, height: 520 };
    await app.prepareRestart();
    expect(process.exits).toBe(0);
    expect(JSON.parse(files.files.get(SETTINGS_FILE) ?? 'null')).toMatchObject({ left: 10, top: 20 });
  });
});
