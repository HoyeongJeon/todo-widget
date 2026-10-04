import type { AutoStart } from '../../application/ports/auto-start.ts';
import type { Invoke } from './invoke.ts';

/** OS 자동 실행 (WIN-03, MAC-08). 판정은 Rust(`todowidget_core::autostart`)가 한다. */
export function createTauriAutoStart(invoke: Invoke): AutoStart {
  async function call(command: string): Promise<unknown> {
    try {
      return await invoke(command);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  return {
    isEnabled: async () => (await call('auto_start_is_enabled')) === true,
    enable: async () => {
      await call('auto_start_enable');
    },
    disable: async () => {
      await call('auto_start_disable');
    },
    refresh: async () => {
      await call('auto_start_refresh');
    },
  };
}
