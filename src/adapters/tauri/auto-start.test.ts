import { describe, expect, it, vi } from 'vitest';
import { createTauriAutoStart } from './auto-start.ts';

describe('Tauri AutoStart adapter', () => {
  it('START-04 네 동작을 Rust 명령으로 넘기고 켜짐 여부를 돌려준다', async () => {
    const invoke = vi.fn(async (command: string) => (command === 'auto_start_is_enabled' ? true : null));
    const autoStart = createTauriAutoStart(invoke);
    expect(await autoStart.isEnabled()).toBe(true);
    await autoStart.enable();
    await autoStart.disable();
    await autoStart.refresh();
    expect(invoke.mock.calls.map(([command]) => command)).toEqual([
      'auto_start_is_enabled',
      'auto_start_enable',
      'auto_start_disable',
      'auto_start_refresh',
    ]);
  });

  it('START-05 Rust가 거부하면 그 문구를 담은 Error로 던진다', async () => {
    const autoStart = createTauriAutoStart(async () => {
      throw '시스템 설정 → 일반 → 로그인 항목에서 허용해야 해요';
    });
    await expect(autoStart.enable()).rejects.toThrow('로그인 항목에서 허용해야 해요');
  });
});
