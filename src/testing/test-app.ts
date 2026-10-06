import { AutoStartControl } from '../application/auto-start-control.ts';
import type { RunningApp } from '../application/launch.ts';
import { AppLifecycle } from '../application/lifecycle.ts';
import { SettingsRepository } from '../application/settings/settings-repository.ts';
import { SettingsService } from '../application/settings/settings-service.ts';
import { TaskRepository } from '../application/storage/task-repository.ts';
import { TodoSession } from '../application/todo-session.ts';
import { UpdateService } from '../application/update-service.ts';
import { WindowPlacement } from '../application/window-placement.ts';
import { FakeAutoStart } from './fake-auto-start.ts';
import { FakeClock } from './fake-clock.ts';
import { FakeProcess } from './fake-process.ts';
import { FakeUpdater } from './fake-updater.ts';
import { FakeWindowController } from './fake-window-controller.ts';
import { ManualTimer } from './manual-timer.ts';
import { MemoryFileStore } from './memory-file-store.ts';
import { sequenceIds } from './sequence-ids.ts';

export interface TestApp {
  app: RunningApp;
  files: MemoryFileStore;
  window: FakeWindowController;
  autoStart: FakeAutoStart;
  updater: FakeUpdater;
  process: FakeProcess;
  clock: FakeClock;
  timer: ManualTimer;
}

/**
 * 화면 테스트용 앱. 가짜 port로 application 서비스를 만들고 창 배치까지 한다(창 1576, 24, 320×520).
 * 업데이트 확인은 시작하지 않는다. 필요하면 테스트가 `app.updates.check()`를 부른다.
 */
export async function createTestApp(files = new MemoryFileStore()): Promise<TestApp> {
  const clock = new FakeClock();
  const timer = new ManualTimer();
  const window = new FakeWindowController();
  const autoStart = new FakeAutoStart();
  const updater = new FakeUpdater();
  const process = new FakeProcess();
  const session = await TodoSession.open(new TaskRepository(files, clock), clock, sequenceIds());
  const settings = await SettingsService.open(new SettingsRepository(files));
  const placement = new WindowPlacement({ window, settings, timer });
  await placement.apply();
  const lifecycle = new AppLifecycle({ session, placement, process });
  const updates = new UpdateService({
    updater,
    clock,
    timer,
    appInfo: { version: '2.0.0', isDevBuild: false },
    settings,
    prepareRestart: () => lifecycle.prepareRestart(),
  });
  return {
    app: { session, settings, placement, lifecycle, updates, autoStart: new AutoStartControl(autoStart) },
    files,
    window,
    autoStart,
    updater,
    process,
    clock,
    timer,
  };
}
