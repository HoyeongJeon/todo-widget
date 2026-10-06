import type { ResizeEdge } from '../domain/resize.ts';
import { resizeLimits } from '../domain/resize.ts';
import { resolveWidgetPosition, resolveWidgetSize } from '../domain/window-geometry.ts';
import type { Timer } from './ports/timer.ts';
import type { PointerStart, WindowController } from './ports/window-controller.ts';
import type { SettingsService } from './settings/settings-service.ts';

/** OS는 끌기가 끝난 때를 알려 주지 않으므로, 마지막 이동 신호에서 이만큼 지나면 놓은 것으로 본다 (WND-02). */
export const MOVE_SAVE_DELAY_MS = 500;

export interface PlacementDeps {
  window: WindowController;
  settings: SettingsService;
  timer: Timer;
}

/**
 * 창 위치·크기·맨 위 고정을 설정과 맞춘다. 켤 때 적용하고(WND-04~09), 옮기거나(WND-02) 크기를 바꾸면(WND-03) 저장하며,
 * 종료할 때 위치를 저장한다(WND-14). 창 높이를 내용에 맞춰 줄이는 일은 계획 5에서 더한다.
 */
export class WindowPlacement {
  readonly #deps: PlacementDeps;
  #cancelSave: (() => void) | null = null;
  #stopMoved: (() => void) | null = null;
  /** 마지막 apply()에서 읽은 주 모니터 작업 영역 높이. 크기 조절을 기다림 없이 시작하는 데 쓴다. */
  #workAreaHeight: number | null = null;

  constructor(deps: PlacementDeps) {
    this.#deps = deps;
  }

  async apply(): Promise<void> {
    const { window, settings } = this.#deps;
    const screen = await window.screen();
    this.#workAreaHeight = screen.primaryWorkArea.height;
    const saved = settings.current;
    const size = resolveWidgetSize(saved.width, saved.maxHeight, screen.primaryWorkArea.height);
    const position = resolveWidgetPosition(saved, size.width, screen.monitors, screen.primaryWorkArea);
    await window.setBounds({ ...position, width: size.width, height: size.maxHeight });
    await window.setPinned(saved.pinned);
    this.#stopMoved ??= window.onMoved(() => this.#scheduleSave());
  }

  async setPinned(pinned: boolean): Promise<void> {
    await this.#deps.window.setPinned(pinned);
    await this.#deps.settings.update({ pinned });
  }

  /**
   * window.resize는 기다림 없이 바로 부른다. 그 전에 IPC를 기다리면 그 사이 놓은 pointer를 adapter가 놓쳐
   * 크기 조절이 끝나지 않고 저장도 되지 않는다. 그래서 끌기 범위는 마지막으로 읽어 둔 작업 영역 높이로 정한다.
   * 예외: apply()가 아직 돌지 않아 읽어 둔 값이 없으면 screen()을 먼저 기다린다(보통 흐름은 아니다).
   * 모니터 구성이 바뀌었을 수 있으므로 화면은 함께 다시 읽고, 놓은 뒤 그 높이로 맞춰 저장하고 기억한다(WND-05).
   */
  async resize(edge: ResizeEdge, start: PointerStart): Promise<void> {
    const { window, settings } = this.#deps;
    const known = this.#workAreaHeight ?? (await window.screen()).primaryWorkArea.height;
    // 거부를 바로 받아 두어, window.resize가 먼저 실패해도 처리하지 않은 거부로 남지 않게 한다.
    const fresh = window.screen().then((screen) => screen.primaryWorkArea.height, () => known);
    const rect = await window.resize(edge, start, resizeLimits(known));
    this.#cancelPending();
    const workAreaHeight = await fresh;
    this.#workAreaHeight = workAreaHeight;
    const size = resolveWidgetSize(rect.width, rect.height, workAreaHeight);
    await settings.update({ left: rect.left, top: rect.top, width: size.width, maxHeight: size.maxHeight });
  }

  /** 종료나 업데이트로 다시 띄우기 전에 지금 위치를 저장한다. 실패해도 던지지 않는다 (WND-14). */
  async captureForQuit(): Promise<void> {
    this.#cancelPending();
    await this.#savePosition();
  }

  dispose(): void {
    this.#cancelPending();
    this.#stopMoved?.();
    this.#stopMoved = null;
  }

  #scheduleSave(): void {
    this.#cancelPending();
    this.#cancelSave = this.#deps.timer.schedule(MOVE_SAVE_DELAY_MS, () => {
      this.#cancelSave = null;
      void this.#savePosition();
    });
  }

  #cancelPending(): void {
    this.#cancelSave?.();
    this.#cancelSave = null;
  }

  async #savePosition(): Promise<void> {
    try {
      const bounds = await this.#deps.window.bounds();
      await this.#deps.settings.update({ left: bounds.left, top: bounds.top });
    } catch {
      // 위치를 읽지 못하면 이번 저장은 건너뛴다. 설정 저장 실패는 SettingsService가 조용히 넘긴다(STORE-17).
    }
  }
}
