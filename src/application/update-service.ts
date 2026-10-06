import type { Clock } from '../domain/clock.ts';
import { isNewerVersion } from '../domain/version.ts';
import type { UpdateNoticeState } from './notices.ts';
import type { AppInfo } from './ports/app-info.ts';
import type { Timer } from './ports/timer.ts';
import type { Updater } from './ports/updater.ts';
import type { SettingsService } from './settings/settings-service.ts';

export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const RETRY_INTERVAL_MS = 60 * 60 * 1000;

export interface UpdateDeps {
  updater: Updater;
  clock: Clock;
  timer: Timer;
  appInfo: AppInfo;
  settings: SettingsService;
  /** 다시 띄우기 전에 종료할 때처럼 설정을 저장한다 (UPD-04, WND-14). */
  prepareRestart: () => Promise<void>;
}

type Listener = () => void;

/** 켤 때와 하루 한 번 새 버전을 확인하고(UPD-01), 누르면 설치한다(UPD-04). 사용자가 누르기 전에는 받지 않는다(UPD-05). */
export class UpdateService {
  readonly #deps: UpdateDeps;
  readonly #listeners = new Set<Listener>();
  #state: UpdateNoticeState = 'none';
  #cancelScheduled: (() => void) | null = null;
  /** 예약된 확인의 시계 시각(epoch ms). 잠자기로 타이머가 멈췄을 때 다시 맞추는 데 쓴다. */
  #dueAt: number | null = null;
  /** 진행 중인 확인. 겹쳐 부르면 이것을 함께 기다린다. */
  #checking: Promise<void> | null = null;
  #disposed = false;

  constructor(deps: UpdateDeps) {
    this.#deps = deps;
  }

  get state(): UpdateNoticeState {
    return this.#state;
  }

  onChange(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** 켤 때는 lastUpdateCheck와 관계없이 확인한다 (UPD-01). */
  start(): Promise<void> {
    return this.check();
  }

  /**
   * 성공하면 확인한 시각을 저장하고 24시간 뒤, 실패하면 1시간 뒤 다시 확인한다 (UPD-01, UPD-06).
   * 확인하는 중에 또 부르면(예: 예약된 확인과 잠자기에서 깨어남) 새로 확인하지 않고 진행 중인 확인을 함께 기다린다.
   */
  check(): Promise<void> {
    this.#checking ??= this.#runCheck().finally(() => {
      this.#checking = null;
    });
    return this.#checking;
  }

  async #runCheck(): Promise<void> {
    this.#cancel();
    // 설치하는 동안 확인하면 adapter가 받아 둔 업데이트를 바꿀 수 있다. 1시간 뒤로 미룬다 (UPD-04, 계획 6 D6).
    if (this.#state === 'installing') {
      this.#schedule(RETRY_INTERVAL_MS);
      return;
    }
    let latest: { version: string };
    try {
      latest = await this.#deps.updater.fetchLatest();
    } catch {
      this.#schedule(RETRY_INTERVAL_MS);
      return;
    }
    if (this.#disposed)
      return;
    try {
      await this.#deps.settings.update({ lastUpdateCheck: this.#deps.clock.now() });
      // 맨 앞에서 거른 뒤에도 확인을 기다리는 동안 설치가 시작될 수 있다. getter로 읽어 TS의 좁히기를 피한다.
      if (this.state !== 'installing')
        this.#setState(isNewerVersion(latest.version, this.#deps.appInfo.version) ? 'available' : 'none');
    } catch {
      // 설정 저장이 던지는 것 같은 예상 못 한 오류로 확인 일정이 끊기지 않게 1시간 뒤 다시 확인한다.
      // (저장 실패는 SettingsService가 삼키고, 안내를 받는 쪽의 오류는 #setState가 막는다.)
      this.#schedule(RETRY_INTERVAL_MS);
      return;
    }
    this.#schedule(CHECK_INTERVAL_MS);
  }

  /**
   * 잠자기에서 깨어나면 24시간이 지났거나 기록이 없을 때 바로 확인한다 (UPD-01).
   * 아직이면, 잠자는 동안 타이머가 멈췄을 수 있으므로 남은 시간(24시간 - 지난 시간) 뒤로 다시 예약한다.
   * 실패 뒤 1시간 다시 확인(UPD-06)이 그보다 먼저면 그 시각을 지킨다. 이미 지났으면 바로 확인한다.
   */
  async onWake(): Promise<void> {
    const now = this.#deps.clock.now().toEpochMs();
    const last = this.#deps.settings.current.lastUpdateCheck;
    const elapsed = last ? now - last.toEpochMs() : Infinity;
    if (elapsed >= CHECK_INTERVAL_MS)
      return this.check();
    if (this.#checking)
      return this.#checking;
    const untilDue = this.#dueAt === null ? Infinity : this.#dueAt - now;
    const remaining = Math.min(CHECK_INTERVAL_MS - elapsed, untilDue);
    if (remaining <= 0)
      return this.check();
    this.#schedule(remaining);
  }

  /** 새 버전 안내나 실패 안내에서 누르면 설치한다. 설치하는 동안은 다시 누를 수 없다 (UPD-04, UPD-07, UPD-08). */
  async install(): Promise<void> {
    if (this.#state !== 'available' && this.#state !== 'failed')
      return;
    this.#setState('installing');
    try {
      await this.#deps.prepareRestart();
      await this.#deps.updater.downloadAndInstall();
    } catch {
      this.#setState('failed');
    }
  }

  /** 예약된 확인을 취소한다. 진행 중인 확인이 끝나도 다시 예약하거나 상태를 바꾸지 않는다. */
  dispose(): void {
    this.#disposed = true;
    this.#cancel();
    this.#listeners.clear();
  }

  #schedule(ms: number): void {
    this.#cancel();
    if (this.#disposed)
      return;
    this.#dueAt = this.#deps.clock.now().toEpochMs() + ms;
    this.#cancelScheduled = this.#deps.timer.schedule(ms, () => {
      void this.check();
    });
  }

  #cancel(): void {
    this.#cancelScheduled?.();
    this.#cancelScheduled = null;
    this.#dueAt = null;
  }

  /** 화면 쪽 오류가 다른 알림이나 확인·설치 흐름을 막지 않게 한다. */
  #setState(state: UpdateNoticeState): void {
    if (this.#disposed || this.#state === state)
      return;
    this.#state = state;
    for (const listener of this.#listeners) {
      try {
        listener();
      } catch {
        // 화면이 다음 알림 때 다시 그린다. 다른 알림과 확인·설치는 이어진다.
      }
    }
  }
}
