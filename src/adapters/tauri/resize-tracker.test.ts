import { describe, expect, it } from 'vitest';
import type { SizeLimits } from '../../domain/resize.ts';
import type { Rect } from '../../domain/window-geometry.ts';
import { type PointerLike, type PointerSource, trackResize } from './resize-tracker.ts';

type EmitType = 'pointermove' | 'pointerup' | 'pointercancel' | 'lostpointercapture';

class FakePointer implements PointerSource {
  readonly #listeners = new Map<string, Set<(event: PointerLike) => void>>();

  addEventListener(type: string, listener: (event: PointerLike) => void): void {
    const set = this.#listeners.get(type) ?? new Set();
    set.add(listener);
    this.#listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: PointerLike) => void): void {
    this.#listeners.get(type)?.delete(listener);
  }

  emit(type: EmitType, screenX: number, screenY: number, buttons?: number): void {
    const event: PointerLike = buttons === undefined ? { screenX, screenY } : { screenX, screenY, buttons };
    for (const listener of [...(this.#listeners.get(type) ?? [])])
      listener(event);
  }

  get listenerCount(): number {
    return [...this.#listeners.values()].reduce((sum, set) => sum + set.size, 0);
  }
}

interface Prepared {
  startRect: Rect;
  limits: SizeLimits;
  nativePerCss: number;
}

const limits = { minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 1040 };
const startRect = { left: 1000, top: 100, width: 320, height: 520 };

/** 준비(시작 영역·범위·배율 읽기)를 테스트가 원할 때 끝낼 수 있게 한다. */
function setup(nativePerCss = 1) {
  const pointer = new FakePointer();
  const frames: Array<() => void> = [];
  const sent: Rect[] = [];
  let finishPreparing: (value: Prepared) => void = () => undefined;
  const preparing = new Promise<Prepared>((resolve) => {
    finishPreparing = resolve;
  });
  const done = trackResize(
    { source: pointer, requestFrame: (callback) => frames.push(callback), setFrame: async (rect) => void sent.push(rect) },
    { edge: 'SouthEast', start: { screenX: 500, screenY: 500 }, prepare: () => preparing },
  );
  const flushFrames = () => frames.splice(0).forEach((callback) => callback());
  const prepare = async () => {
    finishPreparing({ startRect, limits, nativePerCss });
    await new Promise((resolve) => setTimeout(resolve));
  };
  return { pointer, sent, done, flushFrames, prepare };
}

/** 준비가 끝난 상태에서 시작한다. */
async function prepared(nativePerCss = 1) {
  const tracker = setup(nativePerCss);
  await tracker.prepare();
  return tracker;
}

describe('크기 조절 추적', () => {
  it('WND-03 끄는 동안 화면을 그릴 때마다 마지막 위치로 한 번만 창을 바꾼다', async () => {
    const { pointer, sent, flushFrames } = await prepared();
    pointer.emit('pointermove', 510, 505);
    pointer.emit('pointermove', 520, 530);
    expect(sent).toEqual([]);
    flushFrames();
    await Promise.resolve();
    expect(sent).toEqual([{ left: 1000, top: 100, width: 340, height: 550 }]);
  });

  it('WND-03 놓으면 마지막 영역을 적용하고 돌려주며, pointer 듣기를 멈춘다', async () => {
    const { pointer, sent, done } = await prepared();
    pointer.emit('pointerup', 560, 600);
    expect(await done).toEqual({ left: 1000, top: 100, width: 380, height: 620 });
    expect(sent.at(-1)).toEqual({ left: 1000, top: 100, width: 380, height: 620 });
    expect(pointer.listenerCount).toBe(0);
  });

  it('pointer 이동은 native 단위로 바꿔 계산한다 (Windows 배율 1.5)', async () => {
    const { pointer, done } = await prepared(1.5);
    pointer.emit('pointerup', 520, 500);
    expect((await done).width).toBe(350);
  });

  it('취소되면 마지막으로 받은 위치에서 끝낸다', async () => {
    const { pointer, done, flushFrames } = await prepared();
    pointer.emit('pointermove', 540, 500);
    flushFrames();
    pointer.emit('pointercancel', 0, 0);
    expect((await done).width).toBe(360);
  });

  it('창 바꾸기가 실패해도 끝까지 따라가고, 놓으면 끝낸다', async () => {
    const pointer = new FakePointer();
    const done = trackResize(
      { source: pointer, requestFrame: (callback) => callback(), setFrame: async () => Promise.reject(new Error('창이 없어요')) },
      { edge: 'East', start: { screenX: 0, screenY: 0 }, prepare: async () => ({ startRect, limits, nativePerCss: 1 }) },
    );
    await new Promise((resolve) => setTimeout(resolve));
    pointer.emit('pointermove', 10, 0);
    pointer.emit('pointerup', 20, 0);
    expect((await done).width).toBe(340);
  });

  it('WND-03 준비가 끝나기 전에 놓아도 놓은 위치의 영역으로 끝내고 듣기를 멈춘다', async () => {
    const { pointer, sent, done, prepare } = setup();
    pointer.emit('pointermove', 520, 510);
    pointer.emit('pointerup', 560, 600);
    expect(pointer.listenerCount).toBe(0);
    await prepare();
    expect(await done).toEqual({ left: 1000, top: 100, width: 380, height: 620 });
    expect(sent).toEqual([{ left: 1000, top: 100, width: 380, height: 620 }]);
  });

  it('WND-03 준비 중에 받은 마지막 위치는 준비가 끝나면 창에 반영한다', async () => {
    const { pointer, sent, flushFrames, prepare } = setup();
    pointer.emit('pointermove', 510, 505);
    pointer.emit('pointermove', 530, 540);
    await prepare();
    flushFrames();
    await Promise.resolve();
    expect(sent).toEqual([{ left: 1000, top: 100, width: 350, height: 560 }]);
  });

  it('WND-03 버튼을 누르지 않은 pointer 이동이 오면 그 위치에서 끝낸다', async () => {
    const { pointer, sent, done, flushFrames } = await prepared();
    pointer.emit('pointermove', 540, 500, 1);
    flushFrames();
    pointer.emit('pointermove', 560, 520, 0);
    expect(pointer.listenerCount).toBe(0);
    expect(await done).toEqual({ left: 1000, top: 100, width: 380, height: 540 });
    pointer.emit('pointermove', 600, 600, 0);
    flushFrames();
    await Promise.resolve();
    expect(sent.at(-1)).toEqual({ left: 1000, top: 100, width: 380, height: 540 });
  });

  it('WND-03 pointer capture를 잃으면 마지막으로 받은 위치에서 끝낸다', async () => {
    const { pointer, done } = await prepared();
    pointer.emit('pointermove', 540, 500);
    pointer.emit('lostpointercapture', 0, 0);
    expect(pointer.listenerCount).toBe(0);
    expect(await done).toEqual({ left: 1000, top: 100, width: 360, height: 520 });
  });
});
