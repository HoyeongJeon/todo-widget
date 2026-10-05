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
      // 듣기를 시작하지 못하면 OS 종료 요청은 Rust 대비 종료(3초)만 남는다. 거부를 처리하지 않은 채 두지 않는다.
      void listen(QUIT_REQUESTED_EVENT, listener).then((stop) => {
        if (stopped)
          stop();
        else
          unlisten = stop;
      }).catch(() => undefined);
      return () => {
        stopped = true;
        unlisten?.();
      };
    },
  };
}
