import type { Timer } from '../../application/ports/timer.ts';

/** setTimeout으로 한 번 실행한다. 잠자는 동안 멈출 수 있어, 잠자기에서 깨어나면 UpdateService.onWake()가 다시 맞춘다. */
export function createSystemTimer(): Timer {
  return {
    schedule(ms: number, task: () => void): () => void {
      const handle = globalThis.setTimeout(task, ms);
      return () => globalThis.clearTimeout(handle);
    },
  };
}
