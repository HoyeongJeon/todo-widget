import type { PointerStart, ScreenLayout, WindowController } from '../application/ports/window-controller.ts';
import type { ResizeEdge, SizeLimits } from '../domain/resize.ts';
import type { Rect } from '../domain/window-geometry.ts';

/** 테스트용 창. 기본 화면은 window.md 예시와 같은 모니터 하나(1920×1080, 작업 영역 높이 1040)다. */
export class FakeWindowController implements WindowController {
  layout: ScreenLayout = {
    monitors: [{ left: 0, top: 0, width: 1920, height: 1080 }],
    primaryWorkArea: { left: 0, top: 0, width: 1920, height: 1040 },
  };
  current: Rect = { left: 0, top: 0, width: 320, height: 520 };
  pinned: boolean | null = null;
  shown: number[] = [];
  keptHidden = false;
  drags = 0;
  /** resize가 놓을 때 돌려줄 영역. null이면 지금 영역을 그대로 돌려준다. */
  resizeResult: Rect | null = null;
  resizeCalls: Array<{ edge: ResizeEdge; start: PointerStart; limits: SizeLimits }> = [];
  failBounds = false;
  readonly #moved = new Set<() => void>();

  async screen(): Promise<ScreenLayout> {
    return this.layout;
  }

  async bounds(): Promise<Rect> {
    if (this.failBounds)
      throw new Error('창 위치를 읽지 못했어요');
    return { ...this.current };
  }

  async setBounds(rect: Rect): Promise<void> {
    this.current = { ...rect };
  }

  async setPinned(pinned: boolean): Promise<void> {
    this.pinned = pinned;
  }

  async show(paintedAtMs: number): Promise<void> {
    this.shown.push(paintedAtMs);
  }

  async keepHidden(): Promise<void> {
    this.keptHidden = true;
  }

  async startDragging(): Promise<void> {
    this.drags++;
  }

  async resize(edge: ResizeEdge, start: PointerStart, limits: SizeLimits): Promise<Rect> {
    this.resizeCalls.push({ edge, start, limits });
    if (this.resizeResult)
      this.current = { ...this.resizeResult };
    return { ...this.current };
  }

  onMoved(listener: () => void): () => void {
    this.#moved.add(listener);
    return () => this.#moved.delete(listener);
  }

  get movedListeners(): number {
    return this.#moved.size;
  }

  /** 사용자가 창을 끌어 옮긴 것처럼 한다. */
  moveTo(left: number, top: number): void {
    this.current = { ...this.current, left, top };
    for (const listener of this.#moved)
      listener();
  }
}
