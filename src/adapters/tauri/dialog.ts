import { message as tauriMessage } from '@tauri-apps/plugin-dialog';
import type { Dialog } from '../../application/ports/dialog.ts';

type MessageFn = (text: string, options: { title: string; kind: 'error' }) => Promise<unknown>;

export function createDialog(message: MessageFn): Dialog {
  return {
    async showError(title: string, text: string): Promise<void> {
      await message(text, { title, kind: 'error' });
    },
  };
}

export function tauriDialog(): Dialog {
  return createDialog(tauriMessage);
}
