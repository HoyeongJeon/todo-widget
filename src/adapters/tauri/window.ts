import type { Invoke } from './invoke.ts';

type ResizeEdge = 'East' | 'South' | 'SouthEast' | 'West' | 'SouthWest';

interface CurrentWindow {
  startDragging(): Promise<void>;
  startResizeDragging(direction: ResizeEdge): Promise<void>;
}

export function createWindowControls(invoke: Invoke, currentWindow: CurrentWindow) {
  return {
    async ready(paintedAtMs: number): Promise<void> {
      await invoke('show_main', { paintedAtMs });
    },
    async setPinned(pinned: boolean): Promise<void> {
      await invoke('set_pinned', { pinned });
    },
    startDragging: (): Promise<void> => currentWindow.startDragging(),
    startResize: (direction: ResizeEdge): Promise<void> => currentWindow.startResizeDragging(direction),
  };
}
