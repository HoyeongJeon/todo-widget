import { describe, expect, it, vi } from 'vitest';
import { createTauriProcess } from './process.ts';

describe('앱 프로세스', () => {
  it('START-08 끝내기는 quit_app 명령을 부른다', async () => {
    const invoke = vi.fn(async () => undefined);
    await createTauriProcess(invoke, async () => () => undefined).exit();
    expect(invoke).toHaveBeenCalledWith('quit_app');
  });

  it('START-08 OS의 종료 요청(quit-requested)을 넘기고, 그만 받으면 듣기를 푼다', async () => {
    let handler = null as (() => void) | null;
    const unlisten = vi.fn();
    const listen = vi.fn(async (event: string, callback: () => void) => {
      expect(event).toBe('quit-requested');
      handler = callback;
      return unlisten;
    });
    const process = createTauriProcess(async () => undefined, listen);
    const listener = vi.fn();
    const stop = process.onQuitRequested(listener);
    await vi.waitFor(() => expect(handler).not.toBeNull());
    handler?.();
    expect(listener).toHaveBeenCalledOnce();
    stop();
    expect(unlisten).toHaveBeenCalledOnce();
  });
});
