import type { Updater } from '../application/ports/updater.ts';

/** 테스트용 업데이트 서버. `fetchGate`·`installGate`를 주면 그 약속이 끝날 때까지 확인·설치가 멈춰 있다. */
export class FakeUpdater implements Updater {
  latest = '2.1.0';
  failFetch = false;
  failInstall: Error | null = null;
  fetchGate: Promise<void> | null = null;
  installGate: Promise<void> | null = null;
  fetches = 0;
  installs = 0;

  async fetchLatest(): Promise<{ version: string }> {
    this.fetches++;
    if (this.fetchGate)
      await this.fetchGate;
    if (this.failFetch)
      throw new Error('인터넷이 없어요');
    return { version: this.latest };
  }

  async downloadAndInstall(): Promise<void> {
    this.installs++;
    if (this.installGate)
      await this.installGate;
    if (this.failInstall)
      throw this.failInstall;
  }
}
