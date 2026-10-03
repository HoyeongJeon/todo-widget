import type { Clock } from '../domain/clock.ts';
import type { IdGenerator } from '../domain/ids.ts';
import type { AppInfo } from './ports/app-info.ts';
import type { AutoStart } from './ports/auto-start.ts';
import type { FileStore } from './ports/file-store.ts';
import { SettingsRepository } from './settings/settings-repository.ts';
import { SettingsService } from './settings/settings-service.ts';
import { CannotOpenError, TaskRepository } from './storage/task-repository.ts';
import { TodoSession } from './todo-session.ts';

export interface StartupDeps {
  files: FileStore;
  clock: Clock;
  newId: IdGenerator;
  autoStart: AutoStart;
  appInfo: AppInfo;
}

export type StartupResult =
  | { kind: 'cannotOpen'; path: string; detail: string }
  | { kind: 'ready'; session: TodoSession; settings: SettingsService };

/**
 * 할 일을 먼저 읽는다. 읽지 못하면 자동 실행과 첫 설정 파일을 건드리지 않고 멈춘다(STORE-10).
 * 그다음 자동 실행(START-02, START-03, START-07)과 첫 설정 파일(START-02). 이 둘의 실패는 조용히 넘어간다(START-06).
 */
export async function startApp(deps: StartupDeps): Promise<StartupResult> {
  const settingsRepo = new SettingsRepository(deps.files);
  const firstRun = !(await settingsRepo.exists());

  let session: TodoSession;
  try {
    session = await TodoSession.open(new TaskRepository(deps.files, deps.clock), deps.clock, deps.newId);
  } catch (error) {
    if (error instanceof CannotOpenError)
      return { kind: 'cannotOpen', path: error.path, detail: error.detail };
    throw error;
  }

  if (!deps.appInfo.isDevBuild)
    await quietly(() => (firstRun ? deps.autoStart.enable() : deps.autoStart.refresh()));

  const settings = await SettingsService.open(settingsRepo);
  if (firstRun)
    await settings.save();

  return { kind: 'ready', session, settings };
}

async function quietly(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch {
    // START-06: 자동 실행이 실패해도 위젯은 뜬다.
  }
}
