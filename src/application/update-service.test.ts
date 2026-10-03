import { beforeEach, describe, expect, it } from 'vitest';
import { FakeClock, ts } from '../testing/fake-clock.ts';
import { FakeTimer, flush } from '../testing/fake-timer.ts';
import { FakeUpdater } from '../testing/fake-updater.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { SETTINGS_FILE, SettingsRepository } from './settings/settings-repository.ts';
import { SettingsService } from './settings/settings-service.ts';
import { UpdateService } from './update-service.ts';

const HOUR = 60 * 60 * 1000;

let clock: FakeClock;
let timer: FakeTimer;
let updater: FakeUpdater;
let files: MemoryFileStore;
let settings: SettingsService;
let restarts: string[];

async function makeService(lastUpdateCheck: string | null = null): Promise<UpdateService> {
  if (lastUpdateCheck)
    files.files.set(SETTINGS_FILE, JSON.stringify({ lastUpdateCheck }));
  settings = await SettingsService.open(new SettingsRepository(files));
  return new UpdateService({
    updater,
    clock,
    timer,
    appInfo: { version: '2.0.0', isDevBuild: false },
    settings,
    prepareRestart: async () => {
      restarts.push(`prepare(installs=${updater.installs})`);
    },
  });
}

beforeEach(() => {
  clock = new FakeClock('2026-10-03T09:00:00+09:00');
  timer = new FakeTimer(clock);
  updater = new FakeUpdater();
  files = new MemoryFileStore();
  restarts = [];
});

describe('확인 일정', () => {
  it('UPD-01 켤 때 lastUpdateCheck와 관계없이 확인하고, 성공하면 그 시각을 저장하고 24시간 뒤 다시 확인한다', async () => {
    const service = await makeService('2026-10-03T08:00:00+09:00');
    await service.start();
    expect(updater.fetches).toBe(1);
    expect(settings.current.lastUpdateCheck?.format()).toBe('2026-10-03T09:00:00+09:00');
    expect(JSON.parse(files.files.get(SETTINGS_FILE) ?? '').lastUpdateCheck).toBe('2026-10-03T09:00:00+09:00');
    await timer.advance(23 * HOUR);
    expect(updater.fetches).toBe(1);
    await timer.advance(HOUR);
    expect(updater.fetches).toBe(2);
  });

  it('UPD-01 확인에 실패하면 lastUpdateCheck를 바꾸지 않고 1시간 뒤 다시 확인한다', async () => {
    updater.failFetch = true;
    const service = await makeService();
    await service.start();
    expect(settings.current.lastUpdateCheck).toBeNull();
    await timer.advance(59 * 60 * 1000);
    expect(updater.fetches).toBe(1);
    updater.failFetch = false;
    await timer.advance(60 * 1000);
    expect(updater.fetches).toBe(2);
    expect(settings.current.lastUpdateCheck?.format()).toBe('2026-10-03T10:00:00+09:00');
  });

  it('UPD-01 잠자기에서 깨어나면 24시간이 지났거나 기록이 없을 때만 바로 확인한다', async () => {
    const recent = await makeService('2026-10-03T08:00:00+09:00');
    await recent.onWake();
    expect(updater.fetches).toBe(0);

    const old = await makeService('2026-10-02T08:00:00+09:00');
    await old.onWake();
    expect(updater.fetches).toBe(1);

    files.files.clear();
    const never = await makeService();
    await never.onWake();
    expect(updater.fetches).toBe(2);
  });
});

describe('안내', () => {
  it('UPD-03 새 버전이 있을 때만 알리고, 나중에 확인했는데 없으면 안내를 지운다', async () => {
    const service = await makeService();
    await service.start();
    expect(service.state).toBe('available');

    updater.latest = '2.0.0';
    await service.check();
    expect(service.state).toBe('none');

    updater.latest = '1.9.0';
    await service.check();
    expect(service.state).toBe('none');
  });

  it('UPD-05 누르지 않으면 받거나 설치하지 않는다', async () => {
    const service = await makeService();
    await service.start();
    await timer.advance(48 * HOUR);
    expect(updater.installs).toBe(0);
    expect(service.state).toBe('available');
  });

  it('UPD-06 확인에 실패해도 앞서 보이던 안내는 그대로 둔다', async () => {
    const service = await makeService();
    await service.start();
    updater.failFetch = true;
    await service.check();
    expect(service.state).toBe('available');
  });
});

describe('설치', () => {
  it('UPD-04 누르면 설정을 저장한 뒤 받아서 설치하고, 설치하는 동안은 다시 누를 수 없다', async () => {
    const service = await makeService();
    await service.start();
    let open = (): void => undefined;
    updater.installGate = new Promise<void>((resolve) => {
      open = resolve;
    });

    const installing = service.install();
    await flush();
    expect(service.state).toBe('installing');
    await service.install();
    expect(updater.installs).toBe(1);
    expect(restarts).toEqual(['prepare(installs=0)']);

    open();
    await installing;
  });

  it('UPD-07 받기나 설치에 실패하면 다시 시도할 수 있게 실패를 알리고, 다시 누르면 바로 다시 설치한다', async () => {
    const service = await makeService();
    await service.start();
    updater.failInstall = new Error('다운로드 실패');
    await service.install();
    expect(service.state).toBe('failed');

    updater.failInstall = null;
    await service.install();
    expect(updater.installs).toBe(2);
  });

  it('UPD-07 실패 안내는 다음에 확인에 성공할 때 새 버전이 있으면 새 버전 안내로, 없으면 사라진다', async () => {
    const service = await makeService();
    await service.start();
    updater.failInstall = new Error('설치 실패');
    await service.install();
    await service.check();
    expect(service.state).toBe('available');

    await service.install();
    updater.latest = '2.0.0';
    await service.check();
    expect(service.state).toBe('none');
  });

  it('UPD-08 서명이 맞지 않아 설치하지 못하면 UPD-07과 같이 실패로 알린다', async () => {
    const service = await makeService();
    await service.start();
    updater.failInstall = new Error('서명이 맞지 않아요');
    await service.install();
    expect(service.state).toBe('failed');
  });

  it('새 버전이 없으면 눌러도 아무것도 하지 않는다', async () => {
    updater.latest = '2.0.0';
    const service = await makeService();
    await service.start();
    await service.install();
    expect(updater.installs).toBe(0);
  });
});

/** 확인을 멈춰 두고, 돌려준 함수를 부르면 풀어 준다. */
function gateFetch(): () => void {
  let open = (): void => undefined;
  updater.fetchGate = new Promise<void>((resolve) => {
    open = resolve;
  });
  return open;
}

describe('겹침과 오류', () => {
  it('UPD-01 확인이 겹치면 하나로 합쳐 한 번만 확인하고, 다음 확인도 하나만 예약한다', async () => {
    const service = await makeService('2026-10-02T08:00:00+09:00');
    const open = gateFetch();
    const checking = service.check();
    const waking = service.onWake();
    await flush();
    open();
    await Promise.all([checking, waking]);
    expect(updater.fetches).toBe(1);

    await timer.advance(24 * HOUR);
    expect(updater.fetches).toBe(2);
    await timer.advance(24 * HOUR);
    expect(updater.fetches).toBe(3);
  });

  it('확인 뒤 처리에서 예상 못 한 오류가 나도 확인 일정은 이어진다', async () => {
    const service = await makeService();
    settings.update = async () => {
      throw new Error('예상 못 한 오류');
    };
    await service.start();
    expect(updater.fetches).toBe(1);
    await timer.advance(HOUR);
    expect(updater.fetches).toBe(2);
  });

  it('안내를 받는 쪽에서 오류가 나도 확인은 성공으로 끝나고 다른 쪽도 알림을 받는다', async () => {
    const service = await makeService();
    const states: string[] = [];
    service.onChange(() => {
      throw new Error('화면 오류');
    });
    service.onChange(() => states.push(service.state));
    await service.start();
    expect(states).toEqual(['available']);
    await timer.advance(HOUR);
    expect(updater.fetches).toBe(1);
    await timer.advance(23 * HOUR);
    expect(updater.fetches).toBe(2);
  });

  it('UPD-04 안내를 받는 쪽에서 오류가 나도 설치는 이어지고 다른 쪽도 알림을 받는다', async () => {
    const service = await makeService();
    await service.start();
    const states: string[] = [];
    service.onChange(() => {
      throw new Error('화면 오류');
    });
    service.onChange(() => states.push(service.state));
    await expect(service.install()).resolves.toBeUndefined();
    expect(updater.installs).toBe(1);
    expect(states).toEqual(['installing']);
  });
});

describe('알림과 정리', () => {
  it('상태가 바뀌면 알리고, dispose하면 예약된 확인을 취소한다', async () => {
    const service = await makeService();
    const states: string[] = [];
    service.onChange(() => states.push(service.state));
    await service.start();
    expect(states).toEqual(['available']);
    service.dispose();
    await timer.advance(25 * HOUR);
    expect(updater.fetches).toBe(1);
    expect(ts('2026-10-03T09:00:00+09:00').compare(settings.current.lastUpdateCheck ?? ts('2000-01-01T00:00:00+00:00'))).toBe(0);
  });

  it('확인하는 중에 dispose하면 그 확인이 끝나도 다시 예약하지 않고 상태도 바꾸지 않는다', async () => {
    const service = await makeService();
    const open = gateFetch();
    const checking = service.start();
    await flush();
    service.dispose();
    open();
    await checking;
    expect(service.state).toBe('none');
    await timer.advance(5 * 24 * HOUR);
    expect(updater.fetches).toBe(1);
  });
});
