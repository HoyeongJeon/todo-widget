import { beforeEach, describe, expect, it } from 'vitest';
import { FakeWindowController } from '../testing/fake-window-controller.ts';
import { ManualTimer } from '../testing/manual-timer.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { flush } from '../testing/fake-timer.ts';
import { SETTINGS_FILE, SettingsRepository } from './settings/settings-repository.ts';
import { SettingsService } from './settings/settings-service.ts';
import { MOVE_SAVE_DELAY_MS, WindowPlacement } from './window-placement.ts';

let files: MemoryFileStore;
let window: FakeWindowController;
let timer: ManualTimer;

beforeEach(() => {
  files = new MemoryFileStore();
  window = new FakeWindowController();
  timer = new ManualTimer();
});

async function placement(saved?: Record<string, unknown>): Promise<{ placement: WindowPlacement; settings: SettingsService }> {
  if (saved)
    files.files.set(SETTINGS_FILE, JSON.stringify(saved));
  const settings = await SettingsService.open(new SettingsRepository(files));
  return { placement: new WindowPlacement({ window, settings, timer }), settings };
}

function savedSettings(): Record<string, unknown> {
  return JSON.parse(files.files.get(SETTINGS_FILE) ?? 'null');
}

describe('창 배치', () => {
  it('WND-06 WND-07 저장된 크기·위치가 없으면 기본 크기로 작업 영역 오른쪽 위에 띄우고 맨 위에 고정한다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    expect(window.current).toEqual({ left: 1576, top: 24, width: 320, height: 520 });
    expect(window.pinned).toBe(true);
  });

  it('WND-04 WND-05 WND-08 저장된 값은 범위로 맞추고, 헤더를 잡을 수 있는 위치는 그대로 쓴다', async () => {
    const { placement: p } = await placement({ left: 300, top: 200, width: 2000, maxHeight: 3000, pinned: false });
    await p.apply();
    expect(window.current).toEqual({ left: 300, top: 200, width: 620, height: 1040 });
    expect(window.pinned).toBe(false);
  });

  it('WND-08 화면 밖에 저장된 위치는 기본 위치로 띄운다', async () => {
    const { placement: p } = await placement({ left: 2500, top: 100 });
    await p.apply();
    expect(window.current).toMatchObject({ left: 1576, top: 24 });
  });

  it('WND-09 맨 위 고정을 바꾸면 창에 적용하고 저장한다', async () => {
    const { placement: p, settings } = await placement();
    await p.setPinned(false);
    expect(window.pinned).toBe(false);
    expect(settings.current.pinned).toBe(false);
    expect(savedSettings()).toMatchObject({ pinned: false });
  });

  it('WND-02 옮기는 동안은 저장하지 않고, 마지막 이동 0.5초 뒤 한 번 위치를 저장한다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    files.writes.length = 0;
    window.moveTo(100, 100);
    window.moveTo(200, 150);
    window.moveTo(300, 200);
    expect(timer.pending).toBe(1);
    expect(timer.delays.at(-1)).toBe(MOVE_SAVE_DELAY_MS);
    expect(files.writes).toEqual([]);
    timer.runAll();
    await flush();
    expect(files.writes).toEqual([SETTINGS_FILE]);
    expect(savedSettings()).toMatchObject({ left: 300, top: 200 });
  });

  it('WND-02 위치를 읽지 못하면 저장하지 않고 넘어간다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    files.writes.length = 0;
    window.failBounds = true;
    window.moveTo(100, 100);
    timer.runAll();
    await flush();
    expect(files.writes).toEqual([]);
  });

  it('WND-03 크기 조절은 같은 범위로 끌게 하고, 놓으면 폭·최대 높이·위치를 저장한다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    window.resizeResult = { left: 1400, top: 24, width: 496, height: 700 };
    await p.resize('West', { screenX: 1576, screenY: 300 });
    expect(window.resizeCalls).toEqual([
      { edge: 'West', start: { screenX: 1576, screenY: 300 }, limits: { minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 1040 } },
    ]);
    expect(savedSettings()).toMatchObject({ left: 1400, top: 24, width: 496, maxHeight: 700 });
  });

  it('WND-03 크기 조절은 아무것도 기다리지 않고 바로 시작해, 그 사이 놓은 pointer를 놓치지 않는다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    let screenCalls = 0;
    window.screen = () => {
      screenCalls++;
      return new Promise(() => {});
    };
    window.resizeResult = { left: 1400, top: 24, width: 496, height: 700 };
    const done = p.resize('West', { screenX: 1576, screenY: 300 });
    expect(window.resizeCalls).toHaveLength(1);
    expect(window.resizeCalls[0]?.limits).toEqual({ minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 1040 });
    await done;
    expect(screenCalls).toBe(0);
    expect(savedSettings()).toMatchObject({ left: 1400, top: 24, width: 496, maxHeight: 700 });
  });

  it('WND-03 apply 전에 크기를 조절하면 화면을 읽어 같은 범위를 쓴다', async () => {
    const { placement: p } = await placement();
    window.resizeResult = { left: 1400, top: 24, width: 2000, height: 3000 };
    await p.resize('SouthWest', { screenX: 1576, screenY: 300 });
    expect(window.resizeCalls[0]?.limits).toEqual({ minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 1040 });
    expect(savedSettings()).toMatchObject({ left: 1400, top: 24, width: 620, maxHeight: 1040 });
  });

  it('WND-14 종료할 때 지금 위치를 다른 설정과 함께 저장하고, 기다리던 이동 저장은 취소한다', async () => {
    const { placement: p } = await placement({ doneExpanded: true });
    await p.apply();
    window.moveTo(640, 480);
    await p.captureForQuit();
    expect(timer.pending).toBe(0);
    expect(savedSettings()).toMatchObject({ left: 640, top: 480, doneExpanded: true });
  });

  it('WND-14 종료할 때 위치를 읽지 못해도 던지지 않는다', async () => {
    const { placement: p } = await placement();
    window.failBounds = true;
    await expect(p.captureForQuit()).resolves.toBeUndefined();
  });

  it('apply를 다시 불러도 이동 듣기는 하나이고, dispose하면 멈춘다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    await p.apply();
    expect(window.movedListeners).toBe(1);
    window.moveTo(10, 10);
    p.dispose();
    expect(window.movedListeners).toBe(0);
    expect(timer.pending).toBe(0);
  });
});
