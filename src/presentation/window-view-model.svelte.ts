import type { PointerStart } from '../application/ports/window-controller.ts';
import type { WindowPlacement } from '../application/window-placement.ts';
import type { ResizeEdge } from '../domain/resize.ts';
import { SHADOW_MARGIN } from '../domain/window-geometry.ts';
import { type Allowance, type Room, popupExtent } from './menu/menu-placement.ts';
import type { Report } from './report.ts';

export interface WindowDeps {
  placement: WindowPlacement;
  report: Report;
}

/** 창 높이와 크기 조절, 메뉴용 늘리기의 화면 상태 (WND-03, WND-10). */
export class WindowViewModel {
  /** 가장자리를 끄는 중이면 카드가 창 높이를 채운다(v1.4 MC:64-91). */
  resizing = $state(false);
  /** 메뉴 때문에 창 위쪽을 올린 만큼 내용을 아래로 민다. 그래서 카드는 화면에서 제자리다 (D11). */
  lift = $state(0);
  #maxHeight = $state(0);
  #baseHeight = $state(0);
  readonly #placement: WindowPlacement;
  readonly #report: Report;
  #shown = false;
  /** 끄는 동안 마지막으로 받은 내용 높이. 놓은 뒤 이 높이로 한 번 맞춘다. 받지 않았으면 null. */
  #heldContentHeight: number | null = null;
  /** 메뉴·확인 판 세대 번호. 화면을 다시 그리게 할 값이 아니라 $state가 아니다. */
  #popupToken = 0;

  constructor(deps: WindowDeps) {
    this.#placement = deps.placement;
    this.#report = deps.report;
    this.#maxHeight = deps.placement.maxHeight;
    this.#baseHeight = deps.placement.height;
  }

  /** 카드가 쓸 수 있는 가장 큰 높이. 최대 높이에서 위아래 그림자 여백을 뺀다(v1.4 MC:89). */
  get maxCardHeight(): number {
    return this.#maxHeight - 2 * SHADOW_MARGIN;
  }

  /** 메뉴로 늘리기 전, 내용에 맞춘 창 높이. 메뉴 자리를 정할 때 쓴다. */
  get baseHeight(): number {
    return this.#baseHeight;
  }

  /** 처음 한 번: 창 높이를 내용에 맞춘 뒤 창을 보인다. 맞추기에 실패해도 보인다 (D19). */
  async showFirst(contentHeight: number, paintedAtMs: number): Promise<void> {
    if (this.#shown)
      return;
    this.#shown = true;
    await this.#placement.fitToContent(contentHeight).catch((error: unknown) => this.#report('fit', error));
    this.#baseHeight = this.#placement.height;
    await this.#placement.show(paintedAtMs).catch((error: unknown) => this.#report('show', error));
  }

  /**
   * 카드 높이가 바뀌었다. height는 카드 + 위아래 그림자 여백이다 (WND-03). 처음 보이기 전에는 무시한다.
   * 끄는 동안은 맞추지 않고 기억만 한다. 놓은 뒤 카드 높이가 그대로면 다시 알려 오지 않기 때문이다.
   */
  contentResized(height: number): void {
    if (!this.#shown)
      return;
    if (this.resizing) {
      this.#heldContentHeight = height;
      return;
    }
    this.#placement.fitToContent(height).then(
      () => {
        this.#baseHeight = this.#placement.height;
      },
      (error: unknown) => this.#report('fit', error),
    );
  }

  /**
   * 가장자리를 끌어 크기를 바꾼다. 놓을 때까지 resizing이다 (WND-03). placement.resize는 기다림 없이 바로 부른다.
   * 놓은 뒤 끄는 동안 받은 내용 높이로 한 번 맞춘다. 그래야 메뉴로 늘렸다 되돌릴 때 끌기 전 높이로 돌아가지 않는다.
   */
  async resize(edge: ResizeEdge, start: PointerStart): Promise<void> {
    this.resizing = true;
    this.#heldContentHeight = null;
    try {
      await this.#placement.resize(edge, start);
    } catch (error) {
      this.#report('resize', error);
    } finally {
      this.resizing = false;
      this.#maxHeight = this.#placement.maxHeight;
      this.#baseHeight = this.#placement.height;
    }
    const held = this.#heldContentHeight;
    this.#heldContentHeight = null;
    if (held === null)
      return;
    await this.#placement.fitToContent(held).catch((error: unknown) => this.#report('fit', error));
    this.#baseHeight = this.#placement.height;
  }

  /** 헤더를 끌어 창을 옮긴다 (WND-02). */
  startMove(): void {
    this.#placement.startMove().catch((error: unknown) => this.#report('move', error));
  }

  /** 창 위아래로 남은 화면 공간. 읽지 못하면 아래가 넉넉하다고 본다(메뉴가 아래로 뜬다). */
  room(): Promise<Room> {
    return this.#placement.roomAround().catch(() => ({ above: 0, below: Number.POSITIVE_INFINITY }));
  }

  /** 지금 열린 메뉴·확인 판의 세대 번호. 메뉴는 자리를 정하기 시작할 때 받아 fitPopup에 넘긴다 (D27). */
  get popupToken(): number {
    return this.#popupToken;
  }

  /**
   * 판이 창 밖으로 나가면 열린 동안 창을 늘린다. 들어가면 늘려 둔 창을 되돌린다 (WND-10, D11).
   * 그 사이 메뉴가 닫혀 세대 번호가 바뀌었으면 아무것도 하지 않는다. 되돌릴 사람이 없는 늘린 창이 남지 않게 한다 (D27).
   */
  async fitPopup(token: number, popup: { top: number; bottom: number }, allowance: Allowance): Promise<void> {
    if (token !== this.#popupToken)
      return;
    const extent = popupExtent(popup, this.#baseHeight, allowance);
    if (!extent)
      return this.#restore();
    this.lift = extent.raise;
    await this.#placement.expand(extent.raise, extent.height).catch((error: unknown) => {
      // 창을 올리지 못했는데 내용만 내려가 있으면 카드가 잘린다.
      this.lift = 0;
      this.#report('expand', error);
    });
  }

  /** 메뉴·확인 판이 모두 닫혔다. 세대 번호를 올리고, 늘린 창을 되돌린다. 늘리지 않았으면 창은 그대로다. */
  async clearPopup(): Promise<void> {
    this.#popupToken++;
    await this.#restore();
  }

  async #restore(): Promise<void> {
    this.lift = 0;
    await this.#placement.restore().catch((error: unknown) => this.#report('restore', error));
    this.#baseHeight = this.#placement.height;
  }
}
