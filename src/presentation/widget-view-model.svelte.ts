import type { RunningApp } from '../application/launch.ts';
import { pickNotice } from '../application/notices.ts';
import type { PointerStart } from '../application/ports/window-controller.ts';
import type { ResizeEdge } from '../domain/resize.ts';
import type { TodoItem } from '../domain/todo-item.ts';
import type { TodoStatus } from '../domain/todo-status.ts';
import type { MessageKey } from './i18n/keys.ts';
import type { Translate } from './i18n/translator.ts';
import { MoreMenuViewModel } from './more-menu-view-model.svelte.ts';
import { type Report, reportToConsole } from './report.ts';
import { WindowViewModel } from './window-view-model.svelte.ts';

export type SectionName = 'done' | 'todo';

/** 우클릭한 할 일과 그 자리(이벤트의 clientX·clientY). */
export interface ContextMenuState {
  readonly itemId: string;
  readonly x: number;
  readonly y: number;
}

/** 이름 바꾸기 칸. draft는 칸에 지금 쓰여 있는 글이다. */
export interface RenameState {
  readonly id: string;
  readonly draft: string;
}

/** 안내 줄: 안내 문구들과, 있으면 누를 수 있는 `update.action` 글 (START-09). */
export interface NoticeView {
  readonly messages: string[];
  readonly action: string | null;
}

export interface StatusChoice {
  readonly status: TodoStatus;
  readonly label: string;
  readonly checked: boolean;
}

export interface WidgetDeps {
  app: RunningApp;
  t: Translate;
  report?: Report;
}

const STATUS_KEYS: Readonly<Record<TodoStatus, MessageKey>> = { todo: 'status.todo', doing: 'status.doing', done: 'status.done' };
const STATUSES: readonly TodoStatus[] = ['todo', 'doing', 'done'];

/**
 * 위젯 화면 상태. 할 일 목록·헤더·안내 줄·이름 바꾸기·우클릭 메뉴·초기화 확인·📌·섹션 접기를 들고, 동작은 application 서비스에 맡긴다.
 * 서비스는 Svelte 상태가 아니다. 서비스가 바뀌었다고 알리면 #version을 올려, 그 값을 읽는 getter들이 다시 계산되게 한다 (D1).
 */
export class WidgetViewModel {
  readonly t: Translate;
  readonly menu: MoreMenuViewModel;
  readonly window: WindowViewModel;
  pinned = $state(true);
  doneExpanded = $state(false);
  todoExpanded = $state(true);
  renaming = $state<RenameState | null>(null);
  contextMenu = $state<ContextMenuState | null>(null);
  confirmingReset = $state(false);
  readonly #app: RunningApp;
  readonly #report: Report;
  readonly #stops: Array<() => void>;
  #version = $state(0);

  constructor(deps: WidgetDeps) {
    const { app } = deps;
    this.#app = app;
    this.t = deps.t;
    this.#report = deps.report ?? reportToConsole;
    const saved = app.settings.current;
    this.pinned = saved.pinned;
    this.doneExpanded = saved.doneExpanded;
    this.todoExpanded = saved.todoExpanded;
    this.window = new WindowViewModel({ placement: app.placement, report: this.#report });
    this.menu = new MoreMenuViewModel({ app, report: this.#report, hasItems: () => this.itemCount > 0, onReset: () => this.openReset() });
    const bump = (): void => {
      this.#version++;
    };
    this.#stops = [app.session.onChange(bump), app.updates.onChange(bump), app.autoStart.onChange(bump)];
  }

  get itemCount(): number {
    this.#track();
    return this.#app.session.items.length;
  }

  /** 끝낸 일 섹션. 최근에 끝낸 것이 위다 (LIST-04, LIST-05). */
  get doneItems(): TodoItem[] {
    this.#track();
    return this.#app.session.doneSection();
  }

  /** 할 일 섹션. 하는 중이 위다 (LIST-02, LIST-03). */
  get todoItems(): TodoItem[] {
    this.#track();
    return this.#app.session.todoSection();
  }

  /** 보이는 섹션. 위에서부터 끝낸 일, 할 일이고 항목이 없는 섹션은 뺀다 (LIST-01). */
  get sections(): SectionName[] {
    const shown: SectionName[] = [];
    if (this.doneItems.length > 0)
      shown.push('done');
    if (this.todoItems.length > 0)
      shown.push('todo');
    return shown;
  }

  /** LIST-10 */
  get isEmpty(): boolean {
    return this.itemCount === 0;
  }

  /** LIST-06 */
  get remainingText(): string {
    this.#track();
    const remaining = this.#app.session.remainingCount;
    return remaining > 0 ? this.t('header.remaining', remaining) : this.t('header.allDone');
  }

  /** WND-09 */
  get pinTooltip(): string {
    return this.t(this.pinned ? 'pin.on' : 'pin.off');
  }

  /** LIST-07 */
  get doneToggleText(): string {
    return this.t(this.doneExpanded ? 'section.doneHide' : 'section.doneShow');
  }

  /** INPUT-18: N은 지금 전체 할 일 개수다. */
  get resetQuestion(): string {
    return this.t('reset.question', this.itemCount);
  }

  /** 우선순위가 가장 높은 안내 하나 (START-09, UPD-03·04·07). */
  get notice(): NoticeView | null {
    this.#track();
    const { session, autoStart, updates } = this.#app;
    const line = pickNotice({ saveFailed: session.saveFailed, fileProblem: session.fileProblem, autoStartFailed: autoStart.failed, update: updates.state });
    if (!line)
      return null;
    return { messages: line.messages.map((key) => this.t(key)), action: line.action ? this.t('update.action') : null };
  }

  get anyPopupOpen(): boolean {
    return this.menu.open || this.contextMenu !== null || this.confirmingReset;
  }

  /** 우클릭 메뉴의 상태 항목. 지금 상태에 체크한다 (INPUT-12). */
  statusChoices(itemId: string): StatusChoice[] {
    const item = this.#find(itemId);
    return STATUSES.map((status) => ({ status, label: this.t(STATUS_KEYS[status]), checked: item?.status === status }));
  }

  /** 입력칸의 한 줄이나 붙여 넣은 여러 줄을 추가한다. 추가했으면 true (INPUT-02, INPUT-03, INPUT-07, INPUT-20). */
  add(text: string): boolean {
    return this.#app.session.add(text);
  }

  /** 동그라미: 이름 바꾸기 칸이 열려 있으면 먼저 저장하고 상태를 한 단계 바꾼다 (INPUT-11). */
  cycle(id: string): void {
    this.commitRename();
    this.#app.session.cycle(id);
  }

  setStatus(id: string, status: TodoStatus): void {
    this.contextMenu = null;
    this.#app.session.setStatus(id, status);
  }

  /** INPUT-17 */
  remove(id: string): void {
    this.contextMenu = null;
    if (this.renaming?.id === id)
      this.renaming = null;
    this.#app.session.remove(id);
  }

  /** 다른 칸이 열려 있으면 먼저 저장하고, 이 할 일의 이름 바꾸기 칸을 연다 (INPUT-13). */
  startRename(id: string): void {
    this.contextMenu = null;
    this.commitRename();
    const item = this.#find(id);
    if (item)
      this.renaming = { id, draft: item.title };
  }

  updateDraft(draft: string): void {
    if (this.renaming)
      this.renaming = { ...this.renaming, draft };
  }

  /** 칸을 닫고 저장한다. Enter와 포커스 이탈이 겹쳐도 한 번만 저장한다. 빈 제목은 TASK-12대로 바뀌지 않는다 (INPUT-14). */
  commitRename(text?: string): void {
    const current = this.renaming;
    if (!current)
      return;
    this.renaming = null;
    this.#app.session.rename(current.id, text ?? current.draft);
  }

  /** INPUT-15 */
  cancelRename(): void {
    this.renaming = null;
  }

  /** LIST-07, LIST-09 */
  toggleDone(): void {
    this.doneExpanded = !this.doneExpanded;
    void this.#app.settings.update({ doneExpanded: this.doneExpanded });
  }

  /** LIST-08, LIST-09 */
  toggleTodo(): void {
    this.todoExpanded = !this.todoExpanded;
    void this.#app.settings.update({ todoExpanded: this.todoExpanded });
  }

  /** 표시를 바로 바꾸고, 창에 적용하지 못하면 되돌린다 (WND-09). */
  async togglePin(): Promise<void> {
    const next = !this.pinned;
    this.pinned = next;
    try {
      await this.#app.placement.setPinned(next);
    } catch (error) {
      this.pinned = !next;
      this.#report('pin', error);
    }
  }

  /** WND-10 */
  async openMoreMenu(): Promise<void> {
    this.commitRename();
    this.contextMenu = null;
    this.confirmingReset = false;
    await this.menu.show();
  }

  /** INPUT-12 */
  openContextMenu(itemId: string, x: number, y: number): void {
    this.commitRename();
    this.menu.close();
    this.confirmingReset = false;
    this.contextMenu = { itemId, x, y };
  }

  closeContextMenu(): void {
    this.contextMenu = null;
  }

  /** INPUT-18, INPUT-19 */
  openReset(): void {
    if (this.itemCount === 0)
      return;
    this.confirmingReset = true;
  }

  cancelReset(): void {
    this.confirmingReset = false;
  }

  /** TASK-14. settings.json은 바꾸지 않는다 (INPUT-18). */
  confirmReset(): void {
    this.confirmingReset = false;
    this.#app.session.clear();
  }

  /** 바깥을 누르거나 창이 포커스를 잃으면 메뉴와 확인 판을 모두 닫는다(확인 판은 취소, D10). 투명도 미리 보기는 이때 저장한다. */
  closePopups(): void {
    this.menu.close();
    this.contextMenu = null;
    this.confirmingReset = false;
  }

  /** UPD-04, UPD-07 */
  installUpdate(): void {
    this.#app.updates.install().catch((error: unknown) => this.#report('update', error));
  }

  /** 가장자리를 끌기 시작했다. 메뉴를 닫고 이름 바꾸기를 저장한 뒤 바로 크기 조절을 시작한다 (WND-03). */
  startResize(edge: ResizeEdge, start: PointerStart): Promise<void> {
    this.closePopups();
    this.commitRename();
    return this.window.resize(edge, start);
  }

  dispose(): void {
    for (const stop of this.#stops)
      stop();
    this.#app.placement.dispose();
    this.#app.updates.dispose();
  }

  #track(): void {
    void this.#version;
  }

  #find(id: string): TodoItem | undefined {
    return this.#app.session.items.find((item) => item.id === id);
  }
}
