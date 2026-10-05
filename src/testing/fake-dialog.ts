import type { Dialog } from '../application/ports/dialog.ts';

export class FakeDialog implements Dialog {
  readonly shown: Array<{ title: string; message: string }> = [];

  async showError(title: string, message: string): Promise<void> {
    this.shown.push({ title, message });
  }
}
