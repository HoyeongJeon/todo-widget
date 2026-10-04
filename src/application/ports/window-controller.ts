import type { ResizeEdge, SizeLimits } from '../../domain/resize.ts';
import type { Rect } from '../../domain/window-geometry.ts';

/** 모니터 영역(작업 표시줄·메뉴 막대 포함)과 주 모니터 작업 영역 (WND-07, WND-08). */
export interface ScreenLayout {
  monitors: readonly Rect[];
  primaryWorkArea: Rect;
}

/** 끌기를 시작한 pointer의 화면 좌표(CSS px). */
export interface PointerStart {
  screenX: number;
  screenY: number;
}

/**
 * 위젯 창. 위치·크기·영역은 window.md 용어 "크기와 좌표"의 단위다.
 * 실제 구현은 src/adapters/tauri/window-controller.ts, 테스트용은 src/testing/fake-window-controller.ts.
 */
export interface WindowController {
  screen(): Promise<ScreenLayout>;
  bounds(): Promise<Rect>;
  /** 위치와 크기를 한 번에 바꾼다. */
  setBounds(rect: Rect): Promise<void>;
  /** 맨 위 고정 (WND-09). */
  setPinned(pinned: boolean): Promise<void>;
  /** 화면을 다 그렸으면 창을 보인다. paintedAtMs는 계획 2 시험 측정용이다. */
  show(paintedAtMs: number): Promise<void>;
  /** 시작하지 못해 대화 상자만 띄울 때 창을 숨긴 채 둔다 (STORE-10). */
  keepHidden(): Promise<void>;
  /** OS 기본 끌기로 창을 옮긴다 (WND-02). 끝난 때는 알 수 없으므로 onMoved로 안다. */
  startDragging(): Promise<void>;
  /** 가장자리를 끄는 동안 창이 따라오고, 놓으면 마지막 창 영역을 돌려준다 (WND-03). */
  resize(edge: ResizeEdge, start: PointerStart, limits: SizeLimits): Promise<Rect>;
  /** 창이 옮겨질 때마다 부른다. 돌려준 함수를 부르면 그만 받는다. */
  onMoved(listener: () => void): () => void;
}
