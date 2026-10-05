import { describe, expect, it, vi } from 'vitest';
import { type PendingUpdate, type UpdaterApi, createTauriUpdater } from './tauri-updater.ts';

function pending(version: string, fail = false): PendingUpdate & { calls: string[] } {
  const calls: string[] = [];
  return {
    version,
    calls,
    downloadAndInstall: async () => {
      calls.push('install');
      if (fail)
        throw new Error('서명이 맞지 않아요');
    },
    close: async () => void calls.push('close'),
  };
}

function api(result: PendingUpdate | null) {
  const relaunch = vi.fn(async () => undefined);
  const check = vi.fn(async (..._args: unknown[]) => result);
  return { check, relaunch, api: { check, relaunch } satisfies UpdaterApi };
}

describe('Tauri updater adapter', () => {
  it('UPD-02 확인은 인자 없이(사용자 데이터 없이) plugin의 check만 부른다', async () => {
    const { check, api: updaterApi } = api(pending('2.1.0'));
    await createTauriUpdater(updaterApi, '2.0.0').fetchLatest();
    expect(check).toHaveBeenCalledOnce();
    expect(check.mock.calls[0]).toEqual([]);
  });

  it('UPD-03 새 버전이 있으면 그 버전을, 없으면 지금 버전을 돌려준다', async () => {
    expect(await createTauriUpdater(api(pending('2.1.0')).api, '2.0.0').fetchLatest()).toEqual({ version: '2.1.0' });
    expect(await createTauriUpdater(api(null).api, '2.0.0').fetchLatest()).toEqual({ version: '2.0.0' });
  });

  it('UPD-04 설치는 마지막으로 확인한 업데이트를 받아 설치한 뒤 다시 띄운다', async () => {
    const update = pending('2.1.0');
    const { relaunch, api: updaterApi } = api(update);
    const updater = createTauriUpdater(updaterApi, '2.0.0');
    await updater.fetchLatest();
    await updater.downloadAndInstall();
    expect(update.calls).toEqual(['install']);
    expect(relaunch).toHaveBeenCalledOnce();
  });

  it('UPD-07 UPD-08 받기·설치·서명 확인이 실패하면 던지고 다시 띄우지 않는다', async () => {
    const { relaunch, api: updaterApi } = api(pending('2.1.0', true));
    const updater = createTauriUpdater(updaterApi, '2.0.0');
    await updater.fetchLatest();
    await expect(updater.downloadAndInstall()).rejects.toThrow('서명이 맞지 않아요');
    expect(relaunch).not.toHaveBeenCalled();
  });

  it('UPD-05 확인하지 않았거나 새 버전이 없으면 설치하지 않는다', async () => {
    await expect(createTauriUpdater(api(null).api, '2.0.0').downloadAndInstall()).rejects.toThrow();
  });

  it('다시 확인하면 앞서 받은 업데이트 정보를 닫는다', async () => {
    const first = pending('2.1.0');
    const check = vi.fn<() => Promise<PendingUpdate | null>>().mockResolvedValueOnce(first).mockResolvedValueOnce(pending('2.2.0'));
    const updater = createTauriUpdater({ check, relaunch: async () => undefined }, '2.0.0');
    await updater.fetchLatest();
    expect(await updater.fetchLatest()).toEqual({ version: '2.2.0' });
    expect(first.calls).toEqual(['close']);
  });
});
