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
 * 저장은 하나씩 차례로 하고, 늘 그 순간의 전체 목록을 쓴다.
 */
export class TodoSession {
  readonly #list: TodoList;
  readonly #repo: TaskRepository;
  readonly #fileNotice: 'backup' | 'newerFile' | null;
  readonly #listeners = new Set<Listener>();
  #mode: TaskLoadMode;
  #saveFailed: boolean;
  #queue: Promise<void> = Promise.resolve();

  private constructor(list: TodoList, repo: TaskRepository, mode: TaskLoadMode, fileNotice: 'backup' | 'newerFile' | null, saveFailed: boolean) {
    this.#list = list;
    this.#repo = repo;
    this.#mode = mode;
    this.#fileNotice = fileNotice;
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

  /** 다시 켤 때까지 남는 파일 안내 (STORE-08, STORE-14). */
  get fileNotice(): 'backup' | 'newerFile' | null {
    return this.#fileNotice;
  }

  onChange(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** 입력칸의 한 줄이나 붙여 넣은 여러 줄. 여러 개를 추가해도 저장은 한 번이다 (STORE-01). */
  add(text: string): Promise<boolean> {
    return this.#commit(this.#list.addLines(text) > 0);
  }

  cycle(id: string): Promise<boolean> {
    return this.#commit(this.#list.cycle(id));
  }

  setStatus(id: string, status: TodoStatus): Promise<boolean> {
    return this.#commit(this.#list.setStatus(id, status));
  }

  rename(id: string, title: string): Promise<boolean> {
    return this.#commit(this.#list.rename(id, title));
  }

  remove(id: string): Promise<boolean> {
    return this.#commit(this.#list.remove(id));
  }

  clear(): Promise<boolean> {
    return this.#commit(this.#list.clear());
  }

  async #commit(changed: boolean): Promise<boolean> {
    if (!changed)
      return false;
    this.#notify();
    this.#queue = this.#queue.catch(() => undefined).then(() => this.#persist());
    await this.#queue;
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
      if (!(error instanceof FileAccessError))
        throw error;
      this.#setSaveFailed(true);
    }
  }

  #setSaveFailed(value: boolean): void {
    if (this.#saveFailed === value)
      return;
    this.#saveFailed = value;
    this.#notify();
  }

  #notify(): void {
    for (const listener of this.#listeners)
      listener();
  }
}
