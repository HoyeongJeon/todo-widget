import { beforeEach, describe, expect, it } from 'vitest';
import { FakeAutoStart } from '../testing/fake-auto-start.ts';
import { flush } from '../testing/fake-timer.ts';
import { AutoStartControl } from './auto-start-control.ts';

let autoStart: FakeAutoStart;
let control: AutoStartControl;

beforeEach(() => {
  autoStart = new FakeAutoStart();
  control = new AutoStartControl(autoStart);
});

describe('⋯ 메뉴의 자동 실행', () => {
  it('START-04 체크 표시는 실제 등록 상태이고, 누르면 켜고 끈 뒤 다시 읽은 상태를 돌려준다', async () => {
    expect(await control.isEnabled()).toBe(false);
    expect(await control.toggle()).toBe(true);
    expect(autoStart.enabled).toBe(true);
    expect(await control.toggle()).toBe(false);
    expect(autoStart.calls).toEqual(['enable', 'disable']);
  });

  it('START-04 등록 여부를 읽지 못하면 꺼짐으로 보인다', async () => {
    autoStart.isEnabled = async () => {
      throw new Error('읽지 못함');
    };
    expect(await control.isEnabled()).toBe(false);
  });

  it('START-05 OS가 거부하면 안내를 켜고 실제 상태를 돌려주며, 다시 바꾸는 데 성공하면 안내를 끈다', async () => {
    let changes = 0;
    control.onChange(() => changes++);
    autoStart.failEnable = true;
    expect(await control.toggle()).toBe(false);
    expect(control.failed).toBe(true);

    autoStart.failEnable = false;
    expect(await control.toggle()).toBe(true);
    expect(control.failed).toBe(false);
    expect(changes).toBe(2);
  });

  it('START-05 안내를 받는 쪽에서 오류가 나도 바꾸기는 끝나고 다른 쪽도 알림을 받는다', async () => {
    let changes = 0;
    control.onChange(() => {
      throw new Error('화면 오류');
    });
    control.onChange(() => changes++);
    autoStart.failEnable = true;
    await expect(control.toggle()).resolves.toBe(false);
    expect(control.failed).toBe(true);
    expect(changes).toBe(1);

    autoStart.failEnable = false;
    await expect(control.toggle()).resolves.toBe(true);
    expect(control.failed).toBe(false);
    expect(autoStart.enabled).toBe(true);
    expect(changes).toBe(2);
  });

  it('START-04 빠르게 두 번 누르면 차례로 처리해 켰다가 끈다', async () => {
    let release = (): void => undefined;
    autoStart.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = control.toggle();
    const second = control.toggle();
    await flush();
    release();
    expect(await Promise.all([first, second])).toEqual([true, false]);
    expect(autoStart.calls).toEqual(['enable', 'disable']);
    expect(autoStart.enabled).toBe(false);
  });

  it('START-03 START-04 켤 때 자동 실행 등록이 끝나기 전에 누르면 등록이 끝난 뒤에 바꾼다', async () => {
    let release = (): void => undefined;
    const startupDone = new Promise<void>((resolve) => {
      release = resolve;
    });
    control = new AutoStartControl(autoStart, startupDone);
    const toggled = control.toggle();
    await flush();
    expect(autoStart.calls).toEqual([]);
    autoStart.enabled = true;
    release();
    expect(await toggled).toBe(false);
    expect(autoStart.calls).toEqual(['disable']);
  });

  it('START-04 켤 때 등록이 끝나기 전에 메뉴를 열면 등록이 끝난 뒤의 상태를 보인다', async () => {
    let release = (): void => undefined;
    const startupDone = new Promise<void>((resolve) => {
      release = resolve;
    });
    control = new AutoStartControl(autoStart, startupDone);
    let shown: boolean | null = null;
    void control.isEnabled().then((enabled) => {
      shown = enabled;
    });
    await flush();
    expect(shown).toBeNull();
    autoStart.enabled = true;
    release();
    await flush();
    expect(shown).toBe(true);
  });
});
