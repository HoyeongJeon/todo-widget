import type { Timer } from '../application/ports/timer.ts';
import type { FakeClock } from './fake-clock.ts';

interface Entry {
  at: number;
  task: () => void;
  cancelled: boolean;
}

/** 테스트용 타이머. advance가 시계를 옮기며 때가 된 일을 실행하고, 그 일이 만든 비동기 작업까지 기다린다. */
export class FakeTimer implements Timer {
  readonly #clock: FakeClock;
  #entries: Entry[] = [];

  constructor(clock: FakeClock) {
    this.#clock = clock;
  }

  schedule(ms: number, task: () => void): () => void {
    const entry: Entry = { at: this.#clock.now().toEpochMs() + ms, task, cancelled: false };
    this.#entries.push(entry);
    return () => {
      entry.cancelled = true;
    };
  }

  async advance(ms: number): Promise<void> {
    const target = this.#clock.now().toEpochMs() + ms;
    for (;;) {
      const due = this.#entries.filter((e) => !e.cancelled && e.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due)
        break;
      this.#entries = this.#entries.filter((e) => e !== due);
      this.#clock.setEpochMs(due.at);
      due.task();
      await flush();
    }
    this.#clock.setEpochMs(target);
  }
}

/** 이미 시작된 비동기 작업이 끝나도록 이벤트 루프를 몇 번 돌린다. */
export async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++)
    await new Promise((resolve) => setTimeout(resolve, 0));
}
