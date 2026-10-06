import type { Clock } from '../domain/clock.ts';
import type { IdGenerator } from '../domain/ids.ts';
import type { AppInfo } from './ports/app-info.ts';
import type { AutoStart } from './ports/auto-start.ts';
import type { FileStore } from './ports/file-store.ts';
import type { Timer } from './ports/timer.ts';
import { SettingsRepository } from './settings/settings-repository.ts';
import { SettingsService } from './settings/settings-service.ts';
import { RetryingFileStore } from './storage/read-retry.ts';
import { CannotOpenError, TaskRepository } from './storage/task-repository.ts';
import { TodoSession } from './todo-session.ts';

export interface StartupDeps {
  files: FileStore;
  clock: Clock;
  timer: Timer;
  newId: IdGenerator;
  autoStart: AutoStart;
  appInfo: AppInfo;
}

export type StartupResult =
  | { kind: 'cannotOpen'; path: string; detail: string }
  | { kind: 'ready'; session: TodoSession; settings: SettingsService; autoStartDone: Promise<void> };

/**
 * 읽기에 실패하면 잠깐 다시 읽는다(STORE-20). 할 일을 먼저 읽는다. 읽지 못하면 자동 실행과 첫 설정 파일을 건드리지 않고 멈춘다(STORE-10).
 * 그다음 첫 설정 파일(START-02)과 자동 실행(START-02, START-03, START-07). 둘의 실패는 조용히 넘어간다(START-06).
 * 자동 실행 등록은 OS를 거쳐 시간이 걸릴 수 있어 기다리지 않는다(PERF-01). 끝나기를 기다려야 하면 autoStartDone을 쓴다.
 */
export async function startApp(deps: StartupDeps): Promise<StartupResult> {
  const files = new RetryingFileStore(deps.files, deps.timer);
  const settingsRepo = new SettingsRepository(files);
  const firstRun = !(await settingsRepo.exists());

  let session: TodoSession;
  try {
    session = await TodoSession.open(new TaskRepository(files, deps.clock), deps.clock, deps.newId);
  } catch (error) {
    if (error instanceof CannotOpenError)
      return { kind: 'cannotOpen', path: error.path, detail: error.detail };
    throw error;
  }

  const settings = await SettingsService.open(settingsRepo);
  if (firstRun)
    await settings.save();

  const autoStartDone = deps.appInfo.isDevBuild
    ? Promise.resolve()
    : quietly(() => (firstRun ? deps.autoStart.enable() : deps.autoStart.refresh()));
  return { kind: 'ready', session, settings, autoStartDone };
}

async function quietly(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch {
    // START-06: 자동 실행이 실패해도 위젯은 뜬다.
  }
}
