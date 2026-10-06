import type { AutoStart } from './ports/auto-start.ts';

type Listener = () => void;

/** ⋯ 메뉴의 "컴퓨터 켤 때 자동 실행" (START-04, START-05). */
export class AutoStartControl {
  readonly #autoStart: AutoStart;
  readonly #listeners = new Set<Listener>();
  #failed = false;
  /** 바꾸기 줄의 끝. 빠르게 두 번 눌러도 앞의 바꾸기가 끝난 뒤 상태를 읽는다. */
  #queue: Promise<unknown>;

  /** `after`가 끝난 뒤에 바꾼다. 켤 때 자동 실행 등록과 겹쳐 사용자가 끈 것을 다시 켜지 않게 한다(START-03). 거부되지 않아야 한다. */
  constructor(autoStart: AutoStart, after: Promise<void> = Promise.resolve()) {
    this.#autoStart = autoStart;
    this.#queue = after;
  }

  /** 자동 실행 실패 안내. 다시 바꾸는 데 성공하면 꺼진다(다시 켜면 새 객체라 꺼져 있다). */
  get failed(): boolean {
    return this.#failed;
  }

  onChange(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** 메뉴를 열 때마다 읽는다. 읽지 못하면 꺼짐으로 보인다. */
  async isEnabled(): Promise<boolean> {
    try {
      return await this.#autoStart.isEnabled();
    } catch {
      return false;
    }
  }

  /** 켜져 있으면 끄고 꺼져 있으면 켠 뒤, 다시 읽은 실제 상태를 돌려준다. 겹쳐 누르면 차례로 처리한다. */
  toggle(): Promise<boolean> {
    const toggled = this.#queue.then(() => this.#toggleOnce());
    this.#queue = toggled.catch(() => undefined);
    return toggled;
  }

  async #toggleOnce(): Promise<boolean> {
    const wasEnabled = await this.isEnabled();
    try {
      if (wasEnabled)
        await this.#autoStart.disable();
      else
        await this.#autoStart.enable();
      this.#setFailed(false);
    } catch {
      this.#setFailed(true);
    }
    return this.isEnabled();
  }

  /** 화면 쪽 오류가 다른 알림이나 toggle()을 막지 않게 한다. */
  #setFailed(value: boolean): void {
    if (this.#failed === value)
      return;
    this.#failed = value;
    for (const listener of this.#listeners) {
      try {
        listener();
      } catch {
        // 화면이 다음 알림 때 다시 그린다. 다른 알림과 자동 실행 바꾸기는 이어진다.
      }
    }
  }
}
