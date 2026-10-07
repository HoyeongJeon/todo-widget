import { getCurrentWebview } from '@tauri-apps/api/webview';
import { availableMonitors, getCurrentWindow, primaryMonitor } from '@tauri-apps/api/window';
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

/** `@tauri-apps/api/window`·`webview`에서 쓰는 것. composition root가 실제 API로 채운다. */
export interface TauriWindowApi {
  outerPosition(): Promise<Point>;
  outerSize(): Promise<Size>;
  scaleFactor(): Promise<number>;
  startDragging(): Promise<void>;
  /** WebView에 키보드 포커스를 준다. Windows에서는 wry가 WebView2 `MoveFocus`를 부른다(DOM 포커스는 그대로). */
  focusWebview(): Promise<void>;
  onMoved(handler: () => void): Promise<() => void>;
  primaryMonitor(): Promise<TauriMonitor | null>;
  availableMonitors(): Promise<TauriMonitor[]>;
}

/** 실제 Tauri 창 API. Monitor 객체는 필요한 필드(position, size, scaleFactor, workArea)를 그대로 가진다. */
export function tauriWindowApi(): TauriWindowApi {
  const current = getCurrentWindow();
  return {
    outerPosition: () => current.outerPosition(),
    outerSize: () => current.outerSize(),
    scaleFactor: () => current.scaleFactor(),
    startDragging: () => current.startDragging(),
    focusWebview: () => getCurrentWebview().setFocus(),
    onMoved: (handler) => current.onMoved(() => handler()),
    primaryMonitor,
    availableMonitors,
  };
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
        workAreas: monitors.map((m) => toSpec({ ...m.workArea.position, ...m.workArea.size }, m.scaleFactor)),
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

    async setHeight(height: number, raise: number): Promise<void> {
      const { coords, scale } = await context();
      const native = await nativeBounds(coords, scale);
      const perCss = coords.nativePerCss(scale);
      await setFrame({ left: native.left, top: native.top - raise * perCss, width: native.width, height: height * perCss });
    },

    /**
     * Windows WebView2는 맨 위 고정을 바꾸면(tao가 `SetWindowPos`·창 style을 다시 적용한다) DOM 포커스는 입력칸에 남아도
     * 키 입력이 WebView에 오지 않는다. 그래서 바꾼 뒤 WebView에 키보드 포커스를 돌려준다 (WND-09).
     * 돌려주기는 보조 동작이다. 실패해도 맨 위 고정은 이미 바뀌었으므로 실패로 돌려주지 않는다(돌려주면 화면이 📌 표시를 되돌린다).
     */
    async setPinned(pinned: boolean): Promise<void> {
      await invoke('set_pinned', { pinned });
      if (os === 'windows') {
        await api.focusWebview().catch((error: unknown) => {
          console.error('맨 위 고정을 바꾼 뒤 WebView 포커스를 돌려주지 못했어요', error);
        });
      }
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
