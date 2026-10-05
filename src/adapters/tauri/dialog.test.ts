import { describe, expect, it, vi } from 'vitest';
import { createDialog } from './dialog.ts';

describe('대화 상자', () => {
  it('STORE-10 제목과 내용을 오류 대화 상자로 보여 주고 닫힐 때까지 기다린다', async () => {
    const message = vi.fn(async () => undefined);
    await createDialog(message).showError('할 일', '할 일 파일을 열 수 없어요');
    expect(message).toHaveBeenCalledWith('할 일 파일을 열 수 없어요', { title: '할 일', kind: 'error' });
  });
});
