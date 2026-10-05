import type { AppProcess } from '../application/ports/app-process.ts';

export class FakeProcess implements AppProcess {
  exits = 0;
  readonly #listeners = new Set<() => void>();

  async exit(): Promise<void> {
    this.exits++;
  }

  onQuitRequested(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** 테스트: 메뉴 막대 "종료"를 누른 것처럼 한다. */
  requestQuit(): void {
    for (const listener of this.#listeners)
      listener();
  }
}
