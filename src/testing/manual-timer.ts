import type { Timer } from '../application/ports/timer.ts';

/** 테스트용 타이머. 시간 없이, 부를 때 예약된 일을 실행한다. 늦추기(debounce) 확인에 쓴다. */
export class ManualTimer implements Timer {
  readonly delays: number[] = [];
  #entries: Array<{ task: () => void; cancelled: boolean }> = [];

  schedule(ms: number, task: () => void): () => void {
    this.delays.push(ms);
    const entry = { task, cancelled: false };
    this.#entries.push(entry);
    return () => {
      entry.cancelled = true;
    };
  }

  /** 취소되지 않은 예약 수. */
  get pending(): number {
    return this.#entries.filter((entry) => !entry.cancelled).length;
  }

  runAll(): void {
    for (const entry of this.#entries.splice(0)) {
      if (!entry.cancelled)
        entry.task();
    }
  }
}
