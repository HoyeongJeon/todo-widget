import type { AppProcess } from './ports/app-process.ts';
import type { Timer } from './ports/timer.ts';
import type { TodoSession } from './todo-session.ts';
import type { WindowPlacement } from './window-placement.ts';

/** ⋯ → 종료가 저장을 기다리는 최대 시간. OS 쪽 종료 요청의 Rust 대비책(QUIT_FALLBACK_DELAY)과 같다 (계획 6 D7). */
export const QUIT_SAVE_LIMIT_MS = 3000;

export interface LifecycleDeps {
  session: TodoSession;
  placement: WindowPlacement;
  process: AppProcess;
  timer: Timer;
}

/** 종료(START-08)와 업데이트로 다시 띄우기 전(UPD-04)의 저장 순서. 저장이 실패해도 멈추지 않는다 (WND-14). */
export class AppLifecycle {
  readonly #deps: LifecycleDeps;
  #quitting: Promise<void> | null = null;

  constructor(deps: LifecycleDeps) {
    this.#deps = deps;
  }

  /** 한 번만 끝낸다. 끝내기에 실패하면 거부하고, 다음에 누르면 처음부터 다시 한다 (START-08). */
  quit(): Promise<void> {
    this.#quitting ??= this.#quit().catch((error: unknown) => {
      this.#quitting = null;
      throw error;
    });
    return this.#quitting;
  }

  /** 창 위치를 다른 설정과 함께 저장하고(WND-14), 바뀐 할 일이 디스크에 써질 때까지 기다린다. */
  async prepareRestart(): Promise<void> {
    await this.#deps.placement.captureForQuit();
    await this.#deps.session.whenSaved().catch(() => undefined);
  }

  async #quit(): Promise<void> {
    await this.#atMost(QUIT_SAVE_LIMIT_MS, this.prepareRestart());
    await this.#deps.process.exit();
  }

  /** work가 끝나거나 ms가 지나면 끝난다. work의 실패는 삼킨다 (WND-14: 저장이 실패해도 멈추지 않는다). */
  #atMost(ms: number, work: Promise<void>): Promise<void> {
    return new Promise((resolve) => {
      const cancel = this.#deps.timer.schedule(ms, resolve);
      void work.catch(() => undefined).finally(() => {
        cancel();
        resolve();
      });
    });
  }
}
