import { describe, expect, it, vi } from 'vitest';
import { createDialog } from './dialog.ts';

describe('대화 상자', () => {
  it('STORE-10 제목과 내용을 창 없는 오류 대화 상자(show_error_dialog)로 보여 주고 닫힐 때까지 기다린다', async () => {
    let close: () => void = () => undefined;
    const invoke = vi.fn(() => new Promise<unknown>((resolve) => {
      close = () => resolve(undefined);
    }));
    let closed = false;
    const shown = createDialog(invoke).showError('할 일', '할 일 파일을 열 수 없어요').then(() => {
      closed = true;
    });
    expect(invoke).toHaveBeenCalledWith('show_error_dialog', { title: '할 일', message: '할 일 파일을 열 수 없어요' });
    await Promise.resolve();
    expect(closed).toBe(false);
    close();
    await shown;
    expect(closed).toBe(true);
  });
});
