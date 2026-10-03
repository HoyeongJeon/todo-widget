import type { Timer } from '../application/ports/timer.ts';

/** 테스트용 타이머. 기다리지 않고 바로(다음 microtask에) 실행하고, 요청한 대기 시간을 기록한다. */
export class ImmediateTimer implements Timer {
  readonly delays: number[] = [];

  schedule(ms: number, task: () => void): () => void {
    this.delays.push(ms);
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled)
        task();
    });
    return () => {
      cancelled = true;
    };
  }
}
