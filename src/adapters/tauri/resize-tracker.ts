import { type ResizeEdge, type SizeLimits, resizeRect } from '../../domain/resize.ts';
import type { Rect } from '../../domain/window-geometry.ts';

export interface PointerLike {
  screenX: number;
  screenY: number;
}

type PointerType = 'pointermove' | 'pointerup' | 'pointercancel';

/** 브라우저 `window`가 이 모양을 가진다. 화면은 가장자리 요소에 setPointerCapture를 걸어 창 밖에서도 pointer를 받게 한다. */
export interface PointerSource {
  addEventListener(type: PointerType, listener: (event: PointerLike) => void): void;
  removeEventListener(type: PointerType, listener: (event: PointerLike) => void): void;
}

export interface ResizeTrackDeps {
  source: PointerSource;
  requestFrame: (callback: () => void) => void;
  /** native 단위 영역으로 창을 바꾼다(Rust `set_frame`). */
  setFrame: (rect: Rect) => Promise<void>;
}

export interface ResizeTrackArgs {
  edge: ResizeEdge;
  start: PointerLike;
  /** native 단위 */
  startRect: Rect;
  /** native 단위 */
  limits: SizeLimits;
  nativePerCss: number;
}

/**
 * 놓을 때까지 pointer를 따라 창 영역을 바꾸고(WND-03), 마지막 영역(native)을 돌려준다.
 * 화면을 그릴 때마다 한 번만 계산하고, 창 바꾸기는 한 번에 하나만 보낸다. 밀린 것은 가장 새 영역 하나만 남긴다.
 */
export function trackResize(deps: ResizeTrackDeps, args: ResizeTrackArgs): Promise<Rect> {
  return new Promise((resolve) => {
    let latest: PointerLike = args.start;
    let frameRequested = false;
    let finished = false;
    let applied: Rect = args.startRect;
    let pending: Rect | null = null;
    let inFlight: Promise<void> | null = null;

    const rectAt = (pointer: PointerLike): Rect =>
      resizeRect(
        args.startRect,
        args.edge,
        (pointer.screenX - args.start.screenX) * args.nativePerCss,
        (pointer.screenY - args.start.screenY) * args.nativePerCss,
        args.limits,
      );

    const pump = (): void => {
      const rect = pending;
      pending = null;
      if (!rect) {
        inFlight = null;
        return;
      }
      applied = rect;
      inFlight = deps.setFrame(rect).catch(() => undefined).then(pump);
    };

    const push = (rect: Rect): void => {
      if (sameRect(rect, pending ?? applied))
        return;
      pending = rect;
      if (!inFlight)
        pump();
    };

    const onMove = (event: PointerLike): void => {
      latest = event;
      if (frameRequested || finished)
        return;
      frameRequested = true;
      deps.requestFrame(() => {
        frameRequested = false;
        if (!finished)
          push(rectAt(latest));
      });
    };

    const finish = (last: PointerLike): void => {
      if (finished)
        return;
      finished = true;
      deps.source.removeEventListener('pointermove', onMove);
      deps.source.removeEventListener('pointerup', onUp);
      deps.source.removeEventListener('pointercancel', onCancel);
      push(rectAt(last));
      void (async () => {
        while (inFlight)
          await inFlight;
        resolve(applied);
      })();
    };

    const onUp = (event: PointerLike): void => finish(event);
    const onCancel = (): void => finish(latest);

    deps.source.addEventListener('pointermove', onMove);
    deps.source.addEventListener('pointerup', onUp);
    deps.source.addEventListener('pointercancel', onCancel);
  });
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}
