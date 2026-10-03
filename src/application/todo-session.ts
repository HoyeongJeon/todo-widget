import type { Clock } from '../domain/clock.ts';
import type { IdGenerator } from '../domain/ids.ts';
import type { TodoItem } from '../domain/todo-item.ts';
import { TodoList } from '../domain/todo-list.ts';
import type { TodoStatus } from '../domain/todo-status.ts';
import { FileAccessError } from './ports/file-store.ts';
import type { TaskLoadMode, TaskRepository } from './storage/task-repository.ts';

type Listener = () => void;

/**
 * 할 일 목록과 그 저장. 바뀔 때마다 바로 저장하고(STORE-01), 실패하면 다음 변경 때 다시 저장한다(STORE-11).
 * 바꾸는 method는 메모리의 목록을 바로 바꾸고 바뀌었는지를 곧바로 돌려준다. 저장은 줄에 세워 하나씩 차례로 하고,
 * 늘 그 순간의 전체 목록을 쓴다. 저장이 끝나기를 기다려야 하는 곳은 `whenSaved()`를 쓴다.
 * composition root는 끝내기 전(START-08)과 업데이트로 다시 띄우기 전(`prepareRestart`, UPD-04)에 `whenSaved()`를 기다린다.
 */
export class TodoSession {
  readonly #list: TodoList;
  readonly #repo: TaskRepository;
  readonly #fileProblem: 'backup' | 'newerFile' | null;
  readonly #listeners = new Set<Listener>();
  #mode: TaskLoadMode;
  #saveFailed: boolean;
  /** 저장 줄의 끝. 실패해도 거부되지 않아 다음 저장을 막지 않는다. */
  #queue: Promise<void> = Promise.resolve();
  /** 지난 whenSaved() 뒤 처음 난 예상 못 한 저장 오류. */
  #unexpected: { error: unknown } | null = null;

  private constructor(list: TodoList, repo: TaskRepository, mode: TaskLoadMode, fileProblem: 'backup' | 'newerFile' | null, saveFailed: boolean) {
    this.#list = list;
    this.#repo = repo;
    this.#mode = mode;
    this.#fileProblem = fileProblem;
    this.#saveFailed = saveFailed;
  }

  /** 읽지 못하면 CannotOpenError를 그대로 던진다 (STORE-10). */
  static async open(repo: TaskRepository, clock: Clock, newId: IdGenerator): Promise<TodoSession> {
    const load = await repo.load();
    return new TodoSession(new TodoList(clock, newId, load.items), repo, load.mode, load.notice, load.saveFailed);
  }

  get items(): readonly TodoItem[] {
    return this.#list.items;
  }

  todoSection(): TodoItem[] {
    return this.#list.todoSection();
  }

  doneSection(): TodoItem[] {
    return this.#list.doneSection();
  }

  get remainingCount(): number {
    return this.#list.remainingCount;
  }

  /** 할 일 저장 실패 안내 (STORE-11, STORE-13). */
  get saveFailed(): boolean {
    return this.#saveFailed;
  }

  /** 다시 켤 때까지 남는 파일 안내 (STORE-08, STORE-14). `NoticeState.fileProblem`으로 그대로 간다. */
  get fileProblem(): 'backup' | 'newerFile' | null {
    return this.#fileProblem;
  }

  onChange(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** 입력칸의 한 줄이나 붙여 넣은 여러 줄. 여러 개를 추가해도 저장은 한 번이다 (STORE-01). */
  add(text: string): boolean {
    return this.#commit(this.#list.addLines(text) > 0);
  }

  cycle(id: string): boolean {
    return this.#commit(this.#list.cycle(id));
  }

  setStatus(id: string, status: TodoStatus): boolean {
    return this.#commit(this.#list.setStatus(id, status));
  }

  rename(id: string, title: string): boolean {
    return this.#commit(this.#list.rename(id, title));
  }

  remove(id: string): boolean {
    return this.#commit(this.#list.remove(id));
  }

  clear(): boolean {
    return this.#commit(this.#list.clear());
  }

  /**
   * 지금까지 줄에 세운 저장이 모두 끝나면 끝난다. 쓰지 못한 것(FileAccessError)은 saveFailed로만 알린다.
   * 그 밖의 예상 못 한 오류가 있었으면 지난 whenSaved() 뒤 처음 난 오류로 거부한다.
   */
  async whenSaved(): Promise<void> {
    await this.#queue;
    const unexpected = this.#unexpected;
    this.#unexpected = null;
    if (unexpected)
      throw unexpected.error;
  }

  #commit(changed: boolean): boolean {
    if (!changed)
      return false;
    this.#queue = this.#queue.then(() => this.#persist());
    this.#notify();
    return true;
  }

  async #persist(): Promise<void> {
    if (this.#mode === 'readOnly')
      return;
    try {
      if (this.#mode === 'pendingConversion') {
        await this.#repo.convert(this.#list.items);
        this.#mode = 'normal';
      } else {
        await this.#repo.save(this.#list.items);
      }
      this.#setSaveFailed(false);
    } catch (error) {
      if (error instanceof FileAccessError)
        this.#setSaveFailed(true);
      else
        this.#unexpected ??= { error };
    }
  }

  #setSaveFailed(value: boolean): void {
    if (this.#saveFailed === value)
      return;
    this.#saveFailed = value;
    this.#notify();
  }

  /** 화면 쪽 오류가 저장이나 다른 알림을 막지 않게 한다. */
  #notify(): void {
    for (const listener of this.#listeners) {
      try {
        listener();
      } catch {
        // 화면이 다음 알림 때 다시 그린다. 저장 상태에는 영향이 없다.
      }
    }
  }
}
