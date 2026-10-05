import type { AppProcess } from './ports/app-process.ts';
import type { TodoSession } from './todo-session.ts';
import type { WindowPlacement } from './window-placement.ts';

export interface LifecycleDeps {
  session: TodoSession;
  placement: WindowPlacement;
  process: AppProcess;
}

/** 종료(START-08)와 업데이트로 다시 띄우기 전(UPD-04)의 저장 순서. 저장이 실패해도 멈추지 않는다 (WND-14). */
export class AppLifecycle {
  readonly #deps: LifecycleDeps;
  #quitting: Promise<void> | null = null;

  constructor(deps: LifecycleDeps) {
    this.#deps = deps;
  }

  quit(): Promise<void> {
    this.#quitting ??= this.#quit();
    return this.#quitting;
  }

  /** 창 위치를 다른 설정과 함께 저장하고(WND-14), 바뀐 할 일이 디스크에 써질 때까지 기다린다. */
  async prepareRestart(): Promise<void> {
    await this.#deps.placement.captureForQuit();
    await this.#deps.session.whenSaved().catch(() => undefined);
  }

  async #quit(): Promise<void> {
    await this.prepareRestart();
    await this.#deps.process.exit();
  }
}
