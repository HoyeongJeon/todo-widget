import type { ResizeEdge } from '../domain/resize.ts';
import { resizeLimits } from '../domain/resize.ts';
import { resolveWidgetPosition, resolveWidgetSize, spaceAround } from '../domain/window-geometry.ts';
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
 * 종료할 때 위치를 저장한다(WND-14). 창 높이는 내용에 맞추고(WND-03), 메뉴가 창보다 크면 열린 동안 늘린다(WND-10, 저장하지 않음).
 * 창 높이 바꾸기(맞추기·늘리기·되돌리기)는 하나씩 차례로 한다.
 */
export class WindowPlacement {
  readonly #deps: PlacementDeps;
  #cancelSave: (() => void) | null = null;
  #stopMoved: (() => void) | null = null;
  /** 마지막으로 읽은 주 모니터 작업 영역 높이. 크기 조절을 기다림 없이 시작하는 데 쓴다. */
  #workAreaHeight: number | null = null;
  /** 내용에 맞춘 창 높이. 메뉴로 늘린 동안에도 늘리기 전 높이다. */
  #height = 0;
  /** 마지막으로 받은 내용 높이(카드 + 위아래 그림자 여백). */
  #contentHeight: number | null = null;
  /** 메뉴로 창 위쪽을 올린 만큼. 늘리지 않았으면 null. */
  #raised: number | null = null;
  #resizing = false;
  /** 늘린 동안 이동 저장을 건너뛰었다. 되돌린 뒤 다시 저장한다 (WND-02). */
  #saveAfterRestore = false;
  /** 창 높이 바꾸기 줄의 끝. 실패해도 다음 것을 막지 않는다. */
  #frames: Promise<void> = Promise.resolve();

  constructor(deps: PlacementDeps) {
    this.#deps = deps;
  }

  /** 창 높이의 상한(WND-05). apply 전에는 작업 영역을 몰라 300이다. */
  get maxHeight(): number {
    const saved = this.#deps.settings.current;
    return resolveWidgetSize(saved.width, saved.maxHeight, this.#workAreaHeight ?? 0).maxHeight;
  }

  /** 내용에 맞춘 창 높이. 메뉴로 늘린 동안에도 늘리기 전 높이다. */
  get height(): number {
    return this.#height;
  }

  async apply(): Promise<void> {
    const { window, settings } = this.#deps;
    const screen = await window.screen();
    this.#workAreaHeight = screen.primaryWorkArea.height;
    const saved = settings.current;
    const size = resolveWidgetSize(saved.width, saved.maxHeight, screen.primaryWorkArea.height);
    const position = resolveWidgetPosition(saved, size.width, screen.monitors, screen.primaryWorkArea);
    await window.setBounds({ ...position, width: size.width, height: size.maxHeight });
    this.#height = size.maxHeight;
    await window.setPinned(saved.pinned);
    this.#stopMoved ??= window.onMoved(() => this.#scheduleSave());
  }

  async setPinned(pinned: boolean): Promise<void> {
    await this.#deps.window.setPinned(pinned);
    await this.#deps.settings.update({ pinned });
  }

  /** 화면을 다 그렸으면 창을 보인다. */
  show(paintedAtMs: number): Promise<void> {
    return this.#deps.window.show(paintedAtMs);
  }

  /** OS 기본 끌기로 창을 옮긴다 (WND-02). */
  startMove(): Promise<void> {
    return this.#deps.window.startDragging();
  }

  /**
   * 창 높이를 내용에 맞춘다. 최대 높이를 넘지 않는다 (WND-03 "내용이 짧으면 창은 내용만큼").
   * 크기를 끄는 동안 온 높이는 카드가 창을 채운 높이라 무시한다. 메뉴로 늘린 동안은 기억만 했다가 restore()에서 맞춘다.
   * 끌기 직전에 줄을 섰다가 끄는 동안 차례가 온 맞추기도 창을 바꾸지 않는다. 놓은 뒤 화면이 다시 맞춘다.
   */
  fitToContent(height: number): Promise<void> {
    if (this.#resizing)
      return Promise.resolve();
    this.#contentHeight = height;
    return this.#frame(async () => {
      if (this.#raised === null && !this.#resizing)
        await this.#fit();
    });
  }

  /** 메뉴·확인 판이 들어가게 창 위쪽을 raise만큼 올리고 높이를 height로 늘린다. 저장하지 않는다 (WND-10). */
  expand(raise: number, height: number): Promise<void> {
    return this.#frame(async () => {
      const previous = this.#raised ?? 0;
      await this.#deps.window.setHeight(height, raise - previous);
      this.#raised = raise;
    });
  }

  /**
   * 늘린 창을 내용 높이로 되돌린다. 늘리지 않았으면 아무것도 하지 않는다.
   * 실패하면 올린 채로 기억해 위치 저장을 계속 막고, 다음 되돌리기(다음 팝업 닫기, 종료)가 다시 시도한다 (WND-14).
   * 늘린 동안 건너뛴 이동 저장이 있으면 되돌린 뒤 다시 잡는다 (WND-02).
   */
  restore(): Promise<void> {
    return this.#frame(async () => {
      const raised = this.#raised;
      if (raised === null)
        return;
      const target = this.#target() ?? this.#height;
      await this.#deps.window.setHeight(target, -raised);
      this.#height = target;
      this.#raised = null;
      if (this.#saveAfterRestore) {
        this.#saveAfterRestore = false;
        this.#scheduleSave();
      }
    });
  }

  /** 창이 있는 모니터에서 창 위아래로 남은 화면 공간 (WND-10 "아래 공간이 모자라면"). */
  async roomAround(): Promise<{ above: number; below: number }> {
    const [bounds, screen] = await Promise.all([this.#deps.window.bounds(), this.#deps.window.screen()]);
    return spaceAround(bounds, screen.monitors, screen.workAreas, screen.primaryWorkArea);
  }

  /**
   * window.resize는 기다림 없이 바로 부른다. 그 전에 IPC를 기다리면 그 사이 놓은 pointer를 adapter가 놓쳐
   * 크기 조절이 끝나지 않고 저장도 되지 않는다. 그래서 끌기 범위는 마지막으로 읽어 둔 작업 영역 높이로 정한다.
   * 예외: apply()가 아직 돌지 않아 읽어 둔 값이 없으면 screen()을 먼저 기다린다(보통 흐름은 아니다).
   * 모니터 구성이 바뀌었을 수 있으므로 화면은 함께 다시 읽고, 놓은 뒤 그 높이로 맞춰 저장하고 기억한다(WND-05).
   * 놓은 높이가 새 최대 높이이고, 그보다 내용이 짧으면 화면이 다음 fitToContent로 줄인다 (WND-03).
   */
  async resize(edge: ResizeEdge, start: PointerStart): Promise<void> {
    const { window, settings } = this.#deps;
    this.#resizing = true;
    try {
      const known = this.#workAreaHeight ?? (await window.screen()).primaryWorkArea.height;
      // 거부를 바로 받아 두어, window.resize가 먼저 실패해도 처리하지 않은 거부로 남지 않게 한다.
      const fresh = window.screen().then((screen) => screen.primaryWorkArea.height, () => known);
      // 끄는 동안 높이 하한은 놓은 뒤 될 수 있는 가장 작은 창 높이다. 내용에 맞춘 높이를 모르면 지금 창 높이로, 그것도 모르면(apply 전) 300으로 본다 (WND-03).
      const fit = this.#target() ?? (this.#height > 0 ? this.#height : undefined);
      const rect = await window.resize(edge, start, resizeLimits(known, fit));
      this.#cancelPending();
      const workAreaHeight = await fresh;
      this.#workAreaHeight = workAreaHeight;
      this.#height = rect.height;
      const size = resolveWidgetSize(rect.width, rect.height, workAreaHeight);
      await settings.update({ left: rect.left, top: rect.top, width: size.width, maxHeight: size.maxHeight });
    } finally {
      this.#resizing = false;
    }
  }

  /** 종료나 업데이트로 다시 띄우기 전에 지금 위치를 저장한다. 메뉴로 늘렸으면 먼저 되돌린다. 실패해도 던지지 않는다 (WND-14). */
  async captureForQuit(): Promise<void> {
    this.#cancelPending();
    await this.restore().catch(() => undefined);
    await this.#savePosition();
  }

  dispose(): void {
    this.#cancelPending();
    this.#stopMoved?.();
    this.#stopMoved = null;
  }

  #target(): number | null {
    return this.#contentHeight === null ? null : Math.min(Math.ceil(this.#contentHeight), this.maxHeight);
  }

  async #fit(): Promise<void> {
    const target = this.#target();
    if (target === null || target === this.#height)
      return;
    await this.#deps.window.setHeight(target, 0);
    this.#height = target;
  }

  #frame(task: () => Promise<void>): Promise<void> {
    const run = this.#frames.then(task);
    this.#frames = run.catch(() => undefined);
    return run;
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

  /**
   * 메뉴로 창을 늘린 동안은 사용자가 옮긴 위치가 아니므로 저장하지 않는다. 대신 되돌린 뒤 다시 저장하게 표시한다.
   * 위로 늘렸다면 되돌릴 때 이동 신호도 오지만, 아래로만 늘렸으면(raise 0) 오지 않는다.
   */
  async #savePosition(): Promise<void> {
    if (this.#raised !== null) {
      this.#saveAfterRestore = true;
      return;
    }
    try {
      const bounds = await this.#deps.window.bounds();
      await this.#deps.settings.update({ left: bounds.left, top: bounds.top });
    } catch {
      // 위치를 읽지 못하면 이번 저장은 건너뛴다. 설정 저장 실패는 SettingsService가 조용히 넘긴다(STORE-17).
    }
  }
}
