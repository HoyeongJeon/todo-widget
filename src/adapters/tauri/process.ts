import type { AppProcess } from '../../application/ports/app-process.ts';
import type { Invoke } from './invoke.ts';

/** Rust `request_quit`이 보내는 이벤트 (메뉴 막대 "종료", 창 닫기). */
export const QUIT_REQUESTED_EVENT = 'quit-requested';

type Listen = (event: string, handler: () => void) => Promise<() => void>;

export function createTauriProcess(invoke: Invoke, listen: Listen): AppProcess {
  return {
    async exit(): Promise<void> {
      await invoke('quit_app');
    },
    onQuitRequested(listener: () => void): () => void {
      let stopped = false;
      let unlisten: (() => void) | null = null;
      void listen(QUIT_REQUESTED_EVENT, listener).then((stop) => {
        if (stopped)
          stop();
        else
          unlisten = stop;
      });
      return () => {
        stopped = true;
        unlisten?.();
      };
    },
  };
}
