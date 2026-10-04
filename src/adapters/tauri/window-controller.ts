import type { PointerStart, ScreenLayout, WindowController } from '../../application/ports/window-controller.ts';
import type { ResizeEdge, SizeLimits } from '../../domain/resize.ts';
import type { Rect } from '../../domain/window-geometry.ts';
import { Coordinates, type DesktopOs, type PhysicalRect } from './coordinates.ts';
import type { Invoke } from './invoke.ts';
import { type PointerSource, trackResize } from './resize-tracker.ts';

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

/** `@tauri-apps/api/window`의 Monitor 중 쓰는 것. 모두 실제 픽셀이다. */
export interface TauriMonitor {
  position: Point;
  size: Size;
  scaleFactor: number;
  workArea: { position: Point; size: Size };
}

/** `@tauri-apps/api/window`에서 쓰는 것. composition root가 실제 API로 채운다. */
export interface TauriWindowApi {
  outerPosition(): Promise<Point>;
  outerSize(): Promise<Size>;
  scaleFactor(): Promise<number>;
  startDragging(): Promise<void>;
  onMoved(handler: () => void): Promise<() => void>;
  primaryMonitor(): Promise<TauriMonitor | null>;
  availableMonitors(): Promise<TauriMonitor[]>;
}

export interface WindowControllerDeps {
  api: TauriWindowApi;
  invoke: Invoke;
  os: DesktopOs;
  pointer: PointerSource;
  requestFrame: (callback: () => void) => void;
}

export function createWindowController(deps: WindowControllerDeps): WindowController {
  const { api, invoke, os } = deps;

  async function primary(): Promise<TauriMonitor> {
    const found = (await api.primaryMonitor()) ?? (await api.availableMonitors())[0];
    if (!found)
      throw new Error('모니터를 찾지 못했어요');
    return found;
  }

  async function context(): Promise<{ coords: Coordinates; scale: number }> {
    const [main, scale] = await Promise.all([primary(), api.scaleFactor()]);
    return { coords: new Coordinates(os, main.scaleFactor), scale };
  }

  async function nativeBounds(coords: Coordinates, scale: number): Promise<Rect> {
    const [position, size] = await Promise.all([api.outerPosition(), api.outerSize()]);
    return coords.physicalToNative({ ...position, ...size }, scale);
  }

  const setFrame = async (rect: Rect): Promise<void> => {
    await invoke('set_frame', { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
  };

  return {
    async screen(): Promise<ScreenLayout> {
      const [main, monitors] = await Promise.all([primary(), api.availableMonitors()]);
      const coords = new Coordinates(os, main.scaleFactor);
      const toSpec = (rect: PhysicalRect, scale: number): Rect => coords.monitorToSpec(rect, scale);
      return {
        monitors: monitors.map((m) => toSpec({ ...m.position, ...m.size }, m.scaleFactor)),
        primaryWorkArea: toSpec({ ...main.workArea.position, ...main.workArea.size }, main.scaleFactor),
      };
    },

    async bounds(): Promise<Rect> {
      const { coords, scale } = await context();
      return coords.nativeToSpec(await nativeBounds(coords, scale), scale);
    },

    async setBounds(rect: Rect): Promise<void> {
      const { coords, scale } = await context();
      await setFrame(coords.specToNative(rect, scale));
    },

    async setPinned(pinned: boolean): Promise<void> {
      await invoke('set_pinned', { pinned });
    },

    async show(paintedAtMs: number): Promise<void> {
      await invoke('show_main', { paintedAtMs });
    },

    async keepHidden(): Promise<void> {
      await invoke('keep_hidden');
    },

    startDragging: () => api.startDragging(),

    /** pointer 듣기는 IPC를 기다리기 전에 바로 건다. 읽는 동안 놓아도 놓친 것 없이 끝난다. */
    resize(edge: ResizeEdge, start: PointerStart, limits: SizeLimits): Promise<Rect> {
      const ready = context();
      const final = trackResize(
        { source: deps.pointer, requestFrame: deps.requestFrame, setFrame },
        {
          edge,
          start,
          prepare: async () => {
            const { coords, scale } = await ready;
            return {
              startRect: await nativeBounds(coords, scale),
              limits: coords.limitsToNative(limits, scale),
              nativePerCss: coords.nativePerCss(scale),
            };
          },
        },
      );
      return Promise.all([ready, final]).then(([{ coords, scale }, rect]) => coords.nativeToSpec(rect, scale));
    },

    onMoved(listener: () => void): () => void {
      let stopped = false;
      let unlisten: (() => void) | null = null;
      void api.onMoved(listener).then((stop) => {
        if (stopped)
          stop();
        else
          unlisten = stop;
      });
      return () => {
        stopped = true;
        unlisten?.();
      };
    },
  };
}
