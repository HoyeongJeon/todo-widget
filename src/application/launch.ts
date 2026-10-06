import { AutoStartControl } from './auto-start-control.ts';
import { AppLifecycle } from './lifecycle.ts';
import type { AppProcess } from './ports/app-process.ts';
import type { Dialog } from './ports/dialog.ts';
import type { Updater } from './ports/updater.ts';
import type { WindowController } from './ports/window-controller.ts';
import type { SettingsService } from './settings/settings-service.ts';
import { type StartupDeps, startApp } from './startup.ts';
import { TASKS_FILE } from './storage/task-repository.ts';
import type { TodoSession } from './todo-session.ts';
import { UpdateService } from './update-service.ts';
import { WindowPlacement } from './window-placement.ts';

/** STORE-10 대화 상자 문구. composition root가 화면 언어 사전(`app.title`, `error.cannotOpen`)에서 꺼내 넘긴다 (I18N-02). */
export interface LaunchTexts {
  appTitle: string;
  cannotOpen: string;
}

export interface LaunchDeps extends StartupDeps {
  window: WindowController;
  dialog: Dialog;
  process: AppProcess;
  updater: Updater;
  /** 잠자기에서 깨어나면 부른다. 돌려준 함수는 듣기를 멈춘다. */
  watchWake: (onWake: () => void) => () => void;
  texts: LaunchTexts;
}

export interface RunningApp {
  session: TodoSession;
  settings: SettingsService;
  placement: WindowPlacement;
  lifecycle: AppLifecycle;
  updates: UpdateService;
  autoStart: AutoStartControl;
}

export type LaunchResult = { kind: 'exited' } | ({ kind: 'running' } & RunningApp);

/**
 * 위젯을 켠다. 할 일 파일을 열지 못하면 창을 숨긴 채 대화 상자로 알리고 끝낸다(STORE-10).
 * 예상 못 한 오류도 같은 대화 상자로 알린다(개발 결정: 시작 중 오류는 거의 모두 파일 문제다).
 * 열면 창을 배치하고(WND-04~09), 업데이트 확인을 시작하고(UPD-01), OS의 종료 요청을 종료 흐름으로 잇는다(START-08).
 */
export async function launchApp(deps: LaunchDeps): Promise<LaunchResult> {
  let started: Awaited<ReturnType<typeof startApp>>;
  try {
    started = await startApp(deps);
  } catch (error) {
    started = { kind: 'cannotOpen', path: deps.files.displayPath(TASKS_FILE), detail: error instanceof Error ? error.message : String(error) };
  }

  if (started.kind === 'cannotOpen') {
    await deps.window.keepHidden().catch(() => undefined);
    await deps.dialog.showError(deps.texts.appTitle, `${deps.texts.cannotOpen}\n${started.path}\n${started.detail}`).catch(() => undefined);
    await deps.process.exit();
    return { kind: 'exited' };
  }

  const { session, settings } = started;
  const placement = new WindowPlacement({ window: deps.window, settings, timer: deps.timer });
  const lifecycle = new AppLifecycle({ session, placement, process: deps.process, timer: deps.timer });
  const updates = new UpdateService({
    updater: deps.updater,
    clock: deps.clock,
    timer: deps.timer,
    appInfo: deps.appInfo,
    settings,
    prepareRestart: () => lifecycle.prepareRestart(),
  });

  await placement.apply().catch(() => undefined);
  // ⋯ → 종료는 저장을 3초까지만 기다린다(QUIT_SAVE_LIMIT_MS). OS 쪽 종료 요청은 Rust 대비책(QUIT_FALLBACK_DELAY, 3초)도 있다.
  deps.process.onQuitRequested(() => void lifecycle.quit().catch(() => undefined));
  deps.watchWake(() => void updates.onWake());
  void updates.start();

  return { kind: 'running', session, settings, placement, lifecycle, updates, autoStart: new AutoStartControl(deps.autoStart, started.autoStartDone) };
}
