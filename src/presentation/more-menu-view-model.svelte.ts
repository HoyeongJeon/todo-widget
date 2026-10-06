import type { RunningApp } from '../application/launch.ts';
import { opacityFromPercent, resolveOpacity, stepTransparency, transparencyPercent } from '../domain/opacity.ts';
import type { Report } from './report.ts';

export interface MoreMenuDeps {
  app: RunningApp;
  report: Report;
  /** 할 일이 하나라도 있는지. 초기화를 고를 수 있는지 정한다 (INPUT-19). */
  hasItems: () => boolean;
  /** 초기화를 골랐다. 확인 판을 연다 (INPUT-18). */
  onReset: () => void;
}

/**
 * ⋯ 메뉴: 자동 실행 체크(START-04), 투명도(WND-11·12), 초기화(INPUT-18·19), 종료(START-08).
 * 투명도는 끄는 동안 미리 보기 값을 들고 있다가 메뉴를 닫을 때 바뀌었으면 한 번 저장한다(설계 문서 5.1).
 */
export class MoreMenuViewModel {
  open = $state(false);
  autoStartChecked = $state(false);
  /** 아직 저장하지 않은 투명도 %. 없으면 저장된 값을 보인다. */
  #preview = $state<number | null>(null);
  readonly #deps: MoreMenuDeps;

  constructor(deps: MoreMenuDeps) {
    this.#deps = deps;
  }

  /** 슬라이더와 % 값 (0~40). */
  get transparency(): number {
    return this.#preview ?? transparencyPercent(this.#deps.app.settings.current.opacity);
  }

  /** 카드 배경 불투명도. 미리 보기 값을 바로 쓴다 (WND-12). */
  get cardOpacity(): number {
    return opacityFromPercent(this.transparency);
  }

  get resetEnabled(): boolean {
    return this.#deps.hasItems();
  }

  /** 메뉴를 연다. 열 때마다 OS 자동 실행 상태를 읽는다 (START-04). */
  async show(): Promise<void> {
    this.#preview = null;
    this.open = true;
    const enabled = await this.#deps.app.autoStart.isEnabled();
    if (this.open)
      this.autoStartChecked = enabled;
  }

  /** 메뉴를 닫는다. 투명도가 바뀌었으면 한 번 저장한다(WND-12). 저장 실패는 SettingsService가 조용히 넘긴다(STORE-17). */
  close(): void {
    if (!this.open)
      return;
    this.open = false;
    const preview = this.#preview;
    if (preview === null)
      return;
    const opacity = opacityFromPercent(preview);
    const settings = this.#deps.app.settings;
    if (opacity !== resolveOpacity(settings.current.opacity))
      void settings.update({ opacity });
    this.#preview = null;
  }

  /** 1% 단위로 맞추고 0~40%로 제한한다 (WND-11). */
  setTransparency(percent: number): void {
    this.#preview = transparencyPercent(opacityFromPercent(percent));
  }

  /** 슬라이더 위 휠 한 칸: 위로 굴리면 2% 더 투명하게 (WND-12). */
  wheel(up: boolean): void {
    this.setTransparency(stepTransparency(this.transparency, up));
  }

  /** 메뉴를 닫고 자동 실행을 바꾼 뒤, 다시 읽은 실제 상태를 체크에 둔다 (START-04, START-05). */
  async toggleAutoStart(): Promise<void> {
    this.close();
    try {
      this.autoStartChecked = await this.#deps.app.autoStart.toggle();
    } catch (error) {
      this.#deps.report('autoStart', error);
    }
  }

  reset(): void {
    if (!this.resetEnabled)
      return;
    this.close();
    this.#deps.onReset();
  }

  quit(): void {
    this.close();
    this.#deps.app.lifecycle.quit().catch((error: unknown) => this.#deps.report('quit', error));
  }
}
