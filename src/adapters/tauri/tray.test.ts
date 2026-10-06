import { describe, expect, it, vi } from 'vitest';
import { setTrayLabels } from './tray.ts';

describe('메뉴 막대 문구', () => {
  it('MAC-04 I18N-02 화면 언어 사전의 글을 Rust 명령으로 넘긴다', async () => {
    const invoke = vi.fn(async (_command: string, _args?: Record<string, unknown>) => undefined);
    await setTrayLabels(invoke, { open: '열기', quit: '종료' });
    expect(invoke).toHaveBeenCalledWith('set_tray_labels', { open: '열기', quit: '종료' });
  });
});
