import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import type { Dialog } from '../../application/ports/dialog.ts';
import type { Invoke } from './invoke.ts';

/**
 * Rust `show_error_dialog` 명령. 창에 붙이지 않고(parent 없이) 띄운다.
 * STORE-10에서는 창이 숨어 있어, 창에 붙인 macOS sheet는 보이지 않고 닫히지도 않기 때문이다.
 */
export function createDialog(invoke: Invoke): Dialog {
  return {
    async showError(title: string, message: string): Promise<void> {
      await invoke('show_error_dialog', { title, message });
    },
  };
}

export function tauriDialog(): Dialog {
  return createDialog(tauriInvoke);
}
