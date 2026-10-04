import { describe, expect, it } from 'vitest';
import type { Rect } from '../../domain/window-geometry.ts';
import { type PointerLike, type PointerSource, trackResize } from './resize-tracker.ts';

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

  emit(type: 'pointermove' | 'pointerup' | 'pointercancel', screenX: number, screenY: number): void {
    for (const listener of [...(this.#listeners.get(type) ?? [])])
      listener({ screenX, screenY });
  }

  get listenerCount(): number {
    return [...this.#listeners.values()].reduce((sum, set) => sum + set.size, 0);
  }
}

const limits = { minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 1040 };
const startRect = { left: 1000, top: 100, width: 320, height: 520 };

function setup(nativePerCss = 1) {
  const pointer = new FakePointer();
  const frames: Array<() => void> = [];
  const sent: Rect[] = [];
  const done = trackResize(
    { source: pointer, requestFrame: (callback) => frames.push(callback), setFrame: async (rect) => void sent.push(rect) },
    { edge: 'SouthEast', start: { screenX: 500, screenY: 500 }, startRect, limits, nativePerCss },
  );
  const flushFrames = () => frames.splice(0).forEach((callback) => callback());
  return { pointer, sent, done, flushFrames };
}

describe('크기 조절 추적', () => {
  it('WND-03 끄는 동안 화면을 그릴 때마다 마지막 위치로 한 번만 창을 바꾼다', async () => {
    const { pointer, sent, flushFrames } = setup();
    pointer.emit('pointermove', 510, 505);
    pointer.emit('pointermove', 520, 530);
    expect(sent).toEqual([]);
    flushFrames();
    await Promise.resolve();
    expect(sent).toEqual([{ left: 1000, top: 100, width: 340, height: 550 }]);
  });

  it('WND-03 놓으면 마지막 영역을 적용하고 돌려주며, pointer 듣기를 멈춘다', async () => {
    const { pointer, sent, done } = setup();
    pointer.emit('pointerup', 560, 600);
    expect(await done).toEqual({ left: 1000, top: 100, width: 380, height: 620 });
    expect(sent.at(-1)).toEqual({ left: 1000, top: 100, width: 380, height: 620 });
    expect(pointer.listenerCount).toBe(0);
  });

  it('pointer 이동은 native 단위로 바꿔 계산한다 (Windows 배율 1.5)', async () => {
    const { pointer, done } = setup(1.5);
    pointer.emit('pointerup', 520, 500);
    expect((await done).width).toBe(350);
  });

  it('취소되면 마지막으로 받은 위치에서 끝낸다', async () => {
    const { pointer, done, flushFrames } = setup();
    pointer.emit('pointermove', 540, 500);
    flushFrames();
    pointer.emit('pointercancel', 0, 0);
    expect((await done).width).toBe(360);
  });

  it('창 바꾸기가 실패해도 끝까지 따라가고, 놓으면 끝낸다', async () => {
    const pointer = new FakePointer();
    const done = trackResize(
      { source: pointer, requestFrame: (callback) => callback(), setFrame: async () => Promise.reject(new Error('창이 없어요')) },
      { edge: 'East', start: { screenX: 0, screenY: 0 }, startRect, limits, nativePerCss: 1 },
    );
    pointer.emit('pointermove', 10, 0);
    pointer.emit('pointerup', 20, 0);
    expect((await done).width).toBe(340);
  });
});
