// 계획 2 임시 위치. 계획 4에서 application port(WindowController)로 옮긴다.
export type ResizeEdge = 'East' | 'South' | 'SouthEast' | 'West' | 'SouthWest';

/**
 * 화면이 창에 바라는 것. 실제 구현은 src/adapters/tauri/window.ts.
 * method 문법 대신 property 문법으로 적어 매개변수 타입을 엄격하게(strictFunctionTypes) 검사한다.
 */
export interface WindowControlsPort {
  ready: (paintedAtMs: number) => Promise<void>;
  setPinned: (pinned: boolean) => Promise<void>;
  startDragging: () => Promise<void>;
  startResize: (direction: ResizeEdge) => Promise<void>;
}
