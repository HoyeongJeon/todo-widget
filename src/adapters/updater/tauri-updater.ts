import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';
import type { Updater } from '../../application/ports/updater.ts';

/** plugin이 돌려주는 업데이트 중 쓰는 것. 받기·서명 확인·설치는 plugin이 한다 (UPD-08). */
export interface PendingUpdate {
  version: string;
  downloadAndInstall(): Promise<void>;
  close(): Promise<void>;
}

export interface UpdaterApi {
  check(): Promise<PendingUpdate | null>;
  relaunch(): Promise<void>;
}

/** 실제 plugin. 이 폴더만 네트워크를 쓸 수 있다 (PRIV-01). 요청 주소는 tauri.conf.json의 endpoints 하나다 (UPD-02). */
export function tauriUpdaterApi(): UpdaterApi {
  return { check: () => check(), relaunch };
}

/**
 * GitHub Release의 latest.json으로 새 버전을 확인하고, 누르면 받아서 설치한 뒤 다시 띄운다.
 * Windows에서는 설치 프로그램이 앱을 끝내므로 relaunch까지 가지 않는다. 설정 저장은 UpdateService가 그 전에 한다(prepareRestart).
 */
export function createTauriUpdater(api: UpdaterApi, currentVersion: string): Updater {
  let pending: PendingUpdate | null = null;
  /** 설치 중인 업데이트. 이 동안 확인이 와도 바꾸거나 닫지 않는다 (UPD-04, 계획 6 D6). */
  let installing: PendingUpdate | null = null;

  return {
    async fetchLatest(): Promise<{ version: string }> {
      const found = await api.check();
      if (installing) {
        await found?.close().catch(() => undefined);
        return { version: installing.version };
      }
      const previous = pending;
      pending = found;
      await previous?.close().catch(() => undefined);
      return { version: found?.version ?? currentVersion };
    },

    async downloadAndInstall(): Promise<void> {
      if (!pending)
        throw new Error('설치할 업데이트가 없어요');
      installing = pending;
      try {
        await installing.downloadAndInstall();
      } finally {
        installing = null;
      }
      await api.relaunch();
    },
  };
}
