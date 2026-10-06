import { describe, expect, it, vi } from 'vitest';
import type { PointerLike, PointerSource } from './resize-tracker.ts';
import { type TauriMonitor, type TauriWindowApi, createWindowController } from './window-controller.ts';

function monitor(x: number, y: number, width: number, height: number, scaleFactor: number, workHeight = height): TauriMonitor {
  return { position: { x, y }, size: { width, height }, scaleFactor, workArea: { position: { x, y }, size: { width, height: workHeight } } };
}

function setup(os: 'windows' | 'macos', scale: number, overrides: Partial<TauriWindowApi> = {}) {
  let movedHandler: (() => void) | null = null;
  const unlisten = vi.fn();
  const api: TauriWindowApi = {
    outerPosition: async () => ({ x: 1576 * scale, y: 24 * scale }),
    outerSize: async () => ({ width: 320 * scale, height: 520 * scale }),
    scaleFactor: async () => scale,
    startDragging: vi.fn(async () => undefined),
    onMoved: async (handler) => {
      movedHandler = handler;
      return unlisten;
    },
    primaryMonitor: async () => monitor(0, 0, 1920 * scale, 1080 * scale, scale, 1040 * scale),
    availableMonitors: async () => [monitor(0, 0, 1920 * scale, 1080 * scale, scale, 1040 * scale)],
    ...overrides,
  };
  const invoke = vi.fn(async (_command: string, _args?: Record<string, unknown>) => undefined);
  const listeners = new Map<string, (event: PointerLike) => void>();
  const pointer: PointerSource = {
    addEventListener: (type, listener) => void listeners.set(type, listener),
    removeEventListener: (type) => void listeners.delete(type),
  };
  const controller = createWindowController({ api, invoke, os, pointer, requestFrame: (callback) => callback() });
  return { api, invoke, controller, listeners, unlisten, moved: () => movedHandler?.() };
}

describe('Tauri 창 제어 adapter', () => {
  it('WND-07 화면 정보는 spec 좌표로 준다 (Windows 배율 1.25)', async () => {
    const { controller } = setup('windows', 1.25);
    expect(await controller.screen()).toEqual({
      monitors: [{ left: 0, top: 0, width: 1920, height: 1080 }],
      workAreas: [{ left: 0, top: 0, width: 1920, height: 1040 }],
      primaryWorkArea: { left: 0, top: 0, width: 1920, height: 1040 },
    });
    expect(await controller.bounds()).toEqual({ left: 1576, top: 24, width: 320, height: 520 });
  });

  it('WND-07 setBounds는 native 단위로 set_frame을 한 번 부른다', async () => {
    const win = setup('windows', 1.5);
    await win.controller.setBounds({ left: 100, top: 50, width: 320, height: 520 });
    expect(win.invoke).toHaveBeenCalledWith('set_frame', { left: 150, top: 75, width: 480, height: 780 });
    const mac = setup('macos', 2);
    await mac.controller.setBounds({ left: 100, top: 50, width: 320, height: 520 });
    expect(mac.invoke).toHaveBeenCalledWith('set_frame', { left: 100, top: 50, width: 320, height: 520 });
  });

  it('WND-03 setHeight는 지금 위치에서 높이와 위쪽 끝만 native 단위로 바꾼다', async () => {
    const win = setup('windows', 2);
    await win.controller.setHeight(300, 50);
    expect(win.invoke).toHaveBeenCalledWith('set_frame', { left: 3152, top: -52, width: 640, height: 600 });
    const mac = setup('macos', 2);
    await mac.controller.setHeight(300, 0);
    expect(mac.invoke).toHaveBeenCalledWith('set_frame', { left: 1576, top: 24, width: 320, height: 300 });
  });

  it('WND-09 맨 위 고정, 창 보이기, 숨긴 채 두기, 끌기를 넘긴다', async () => {
    const { api, invoke, controller } = setup('macos', 2);
    await controller.setPinned(false);
    await controller.show(12);
    await controller.keepHidden();
    await controller.startDragging();
    expect(invoke.mock.calls).toEqual([
      ['set_pinned', { pinned: false }],
      ['show_main', { paintedAtMs: 12 }],
      ['keep_hidden'],
    ]);
    expect(api.startDragging).toHaveBeenCalledOnce();
  });

  it('WND-03 크기 조절은 native 단위로 따라가고, 놓으면 spec 좌표로 돌려준다 (Windows 배율 2)', async () => {
    const { controller, invoke, listeners } = setup('windows', 2);
    const done = controller.resize('East', { screenX: 100, screenY: 100 }, { minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 1040 });
    expect(listeners.has('pointerup')).toBe(true);
    listeners.get('pointerup')?.({ screenX: 150, screenY: 100 });
    expect(await done).toEqual({ left: 1576, top: 24, width: 370, height: 520 });
    expect(invoke).toHaveBeenLastCalledWith('set_frame', { left: 3152, top: 48, width: 740, height: 1040 });
  });

  it('WND-03 IPC가 끝나기 전에 놓아도 놓은 위치로 크기 조절을 끝낸다', async () => {
    let openGate: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    const held = <T>(value: T) => async () => {
      await gate;
      return value;
    };
    const { controller, invoke, listeners } = setup('windows', 2, {
      outerPosition: held({ x: 3152, y: 48 }),
      outerSize: held({ width: 640, height: 1040 }),
      scaleFactor: held(2),
      primaryMonitor: held(monitor(0, 0, 3840, 2160, 2, 2080)),
    });
    const done = controller.resize('East', { screenX: 100, screenY: 100 }, { minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 1040 });
    listeners.get('pointerup')?.({ screenX: 150, screenY: 100 });
    expect(listeners.size).toBe(0);
    expect(invoke).not.toHaveBeenCalled();
    openGate();
    expect(await done).toEqual({ left: 1576, top: 24, width: 370, height: 520 });
    expect(invoke).toHaveBeenCalledExactlyOnceWith('set_frame', { left: 3152, top: 48, width: 740, height: 1040 });
  });

  it('WND-07 Windows 혼합 배율에서 위치는 주 모니터 배율, 크기는 창 배율로 바꾼다 (주 1.5, 창 1)', async () => {
    const { controller, invoke } = setup('windows', 1, {
      outerPosition: async () => ({ x: 3000, y: 150 }),
      outerSize: async () => ({ width: 320, height: 520 }),
      scaleFactor: async () => 1,
      primaryMonitor: async () => monitor(0, 0, 2880, 1620, 1.5, 1560),
    });
    expect(await controller.bounds()).toEqual({ left: 2000, top: 100, width: 320, height: 520 });
    await controller.setBounds({ left: 100, top: 50, width: 300, height: 400 });
    expect(invoke).toHaveBeenCalledWith('set_frame', { left: 150, top: 75, width: 300, height: 400 });
  });

  it('WND-02 이동 신호를 넘기고, 그만 받으면 Tauri 듣기를 푼다', async () => {
    const { controller, moved, unlisten } = setup('macos', 2);
    const listener = vi.fn();
    const stop = controller.onMoved(listener);
    await vi.waitFor(() => {
      moved();
      expect(listener).toHaveBeenCalled();
    });
    stop();
    expect(unlisten).toHaveBeenCalledOnce();
  });
});
