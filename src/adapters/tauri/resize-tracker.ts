import { type ResizeEdge, type SizeLimits, resizeRect } from '../../domain/resize.ts';
import type { Rect } from '../../domain/window-geometry.ts';

export interface PointerLike {
  screenX: number;
  screenY: number;
  /** 누르고 있는 버튼. 0이면 아무 버튼도 누르지 않은 것이다. 없으면 누르고 있다고 본다. */
  buttons?: number;
}

type PointerType = 'pointermove' | 'pointerup' | 'pointercancel' | 'lostpointercapture';

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

/** 크기 조절을 시작할 때 OS에서 읽어 오는 값. 모두 native 단위다. */
export interface ResizePreparation {
  startRect: Rect;
  limits: SizeLimits;
  nativePerCss: number;
}

export interface ResizeTrackArgs {
  edge: ResizeEdge;
  start: PointerLike;
  /** 시작 영역·범위·배율을 읽는다. 읽는 동안 온 pointer도 놓치지 않도록 듣기를 먼저 건 뒤에 부른다. */
  prepare: () => Promise<ResizePreparation>;
}

/**
 * 놓을 때까지 pointer를 따라 창 영역을 바꾸고(WND-03), 마지막 영역(native)을 돌려준다.
 * pointer 듣기는 부르는 즉시 건다. 준비가 끝나기 전에 온 마지막 위치와 끝남은 기억했다가 준비가 끝나면 반영한다.
 * 놓기, 취소, pointer capture 잃음, 버튼을 누르지 않은 이동 중 하나가 오면 끝낸다.
 * 화면을 그릴 때마다 한 번만 계산하고, 창 바꾸기는 한 번에 하나만 보낸다. 밀린 것은 가장 새 영역 하나만 남긴다.
 */
export function trackResize(deps: ResizeTrackDeps, args: ResizeTrackArgs): Promise<Rect> {
  return new Promise((resolve, reject) => {
    let latest: PointerLike = args.start;
    let ready: ResizePreparation | null = null;
    let frameRequested = false;
    let finished = false;
    let applied: Rect | null = null;
    let pending: Rect | null = null;
    let inFlight: Promise<void> | null = null;

    const rectAt = (prep: ResizePreparation, pointer: PointerLike): Rect =>
      resizeRect(
        prep.startRect,
        args.edge,
        (pointer.screenX - args.start.screenX) * prep.nativePerCss,
        (pointer.screenY - args.start.screenY) * prep.nativePerCss,
        prep.limits,
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
      const current = pending ?? applied;
      if (current && sameRect(rect, current))
        return;
      pending = rect;
      if (!inFlight)
        pump();
    };

    const scheduleFrame = (): void => {
      if (frameRequested || finished || !ready)
        return;
      frameRequested = true;
      deps.requestFrame(() => {
        frameRequested = false;
        if (!finished && ready)
          push(rectAt(ready, latest));
      });
    };

    const complete = async (prep: ResizePreparation): Promise<void> => {
      push(rectAt(prep, latest));
      while (inFlight)
        await inFlight;
      resolve(applied ?? prep.startRect);
    };

    const stopListening = (): void => {
      deps.source.removeEventListener('pointermove', onMove);
      deps.source.removeEventListener('pointerup', onUp);
      deps.source.removeEventListener('pointercancel', onCancel);
      deps.source.removeEventListener('lostpointercapture', onCancel);
    };

    const finish = (last: PointerLike): void => {
      if (finished)
        return;
      finished = true;
      latest = last;
      stopListening();
      if (ready)
        void complete(ready);
    };

    const onMove = (event: PointerLike): void => {
      if (event.buttons === 0) {
        finish(event);
        return;
      }
      latest = event;
      scheduleFrame();
    };
    const onUp = (event: PointerLike): void => finish(event);
    const onCancel = (): void => finish(latest);

    deps.source.addEventListener('pointermove', onMove);
    deps.source.addEventListener('pointerup', onUp);
    deps.source.addEventListener('pointercancel', onCancel);
    deps.source.addEventListener('lostpointercapture', onCancel);

    args.prepare().then(
      (prep) => {
        ready = prep;
        if (finished)
          void complete(prep);
        else if (latest !== args.start)
          scheduleFrame();
      },
      (error: unknown) => {
        finished = true;
        stopListening();
        reject(error);
      },
    );
  });
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}
