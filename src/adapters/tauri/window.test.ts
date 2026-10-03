import { describe, expect, it, vi } from 'vitest';
import { createWindowControls } from './window.ts';

function fakes() {
  const invoke = vi.fn(async () => undefined);
  const currentWindow = {
    startDragging: vi.fn(async () => undefined),
    startResizeDragging: vi.fn(async () => undefined),
  };
  return { invoke, currentWindow, controls: createWindowControls(invoke, currentWindow) };
}

describe('창 제어 adapter', () => {
  it('ready는 show_main 명령에 그린 시각을 넘긴다', async () => {
    const { invoke, controls } = fakes();
    await controls.ready(3.5);
    expect(invoke).toHaveBeenCalledWith('show_main', { paintedAtMs: 3.5 });
  });

  it('setPinned는 set_pinned 명령을 부른다', async () => {
    const { invoke, controls } = fakes();
    await controls.setPinned(false);
    expect(invoke).toHaveBeenCalledWith('set_pinned', { pinned: false });
  });

  it('끌기와 크기 조절은 Tauri 창 API로 넘긴다', async () => {
    const { currentWindow, controls } = fakes();
    await controls.startDragging();
    await controls.startResize('SouthEast');
    expect(currentWindow.startDragging).toHaveBeenCalledOnce();
    expect(currentWindow.startResizeDragging).toHaveBeenCalledWith('SouthEast');
  });
});
