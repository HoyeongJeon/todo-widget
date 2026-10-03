export type ResizeEdge = 'East' | 'South' | 'SouthEast' | 'West' | 'SouthWest';

/** 화면이 창에 바라는 것. 실제 구현은 src/adapters/tauri/window.ts. */
export interface WindowControlsPort {
  ready(paintedAtMs: number): Promise<void>;
  setPinned(pinned: boolean): Promise<void>;
  startDragging(): Promise<void>;
  startResize(direction: ResizeEdge): Promise<void>;
}
