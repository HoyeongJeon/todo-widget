import type { Clock } from '../../domain/clock.ts';
import type { TodoItem } from '../../domain/todo-item.ts';
import { FileAccessError, type FileStore } from '../ports/file-store.ts';
import { decodeTasks, encodeTasks } from './tasks-codec.ts';

export const TASKS_FILE = 'tasks.json';
const BROKEN_PREFIX = 'tasks.broken';
const V1_BACKUP_PREFIX = 'tasks.v1-backup';

/** tasks.json을 읽을 수 없다. 원본을 덮어쓰지 않도록 앱을 띄우지 않는다 (STORE-10). */
export class CannotOpenError extends Error {
  readonly path: string;
  readonly detail: string;

  constructor(path: string, detail: string, options?: ErrorOptions) {
    super(`${path}: ${detail}`, options);
    this.name = 'CannotOpenError';
    this.path = path;
    this.detail = detail;
  }
}

/** normal: 평소. pendingConversion: v1 백업에 실패해 다음 변경 때 다시 변환한다(STORE-13). readOnly: 더 새 버전 파일이라 저장하지 않는다(STORE-14). */
export type TaskLoadMode = 'normal' | 'pendingConversion' | 'readOnly';

export interface TaskLoad {
  items: TodoItem[];
  mode: TaskLoadMode;
  notice: 'backup' | 'newerFile' | null;
  saveFailed: boolean;
}

export class TaskRepository {
  readonly #files: FileStore;
  readonly #clock: Clock;
  /** v1 원본 백업을 이미 했다. 그 뒤로는 저장만 다시 시도한다 (STORE-12, STORE-13). */
  #v1BackedUp = false;

  constructor(files: FileStore, clock: Clock) {
    this.#files = files;
    this.#clock = clock;
  }

  async load(): Promise<TaskLoad> {
    let text: string | null;
    try {
      text = await this.#files.read(TASKS_FILE);
    } catch (error) {
      throw this.#cannotOpen(error);
    }
    if (text === null)
      return ready([]);

    const decoded = decodeTasks(text);
    switch (decoded.kind) {
      case 'v2':
        return ready(decoded.items);
      case 'newer':
        return { items: [], mode: 'readOnly', notice: 'newerFile', saveFailed: false };
      case 'broken':
        try {
          await this.#files.rename(TASKS_FILE, await this.#freeName(BROKEN_PREFIX));
        } catch (error) {
          throw this.#cannotOpen(error);
        }
        return { items: [], mode: 'normal', notice: 'backup', saveFailed: false };
      case 'v1':
        return this.#convertOnLoad(decoded.items);
    }
  }

  async save(items: readonly TodoItem[]): Promise<void> {
    await this.#files.writeAtomic(TASKS_FILE, encodeTasks(items));
  }

  /** v1.4 원본을 백업한 뒤 v2로 저장한다 (STORE-12, STORE-13의 다시 시도). 백업은 한 번만 한다. 실패하면 FileAccessError. */
  async convert(items: readonly TodoItem[]): Promise<void> {
    await this.#backUpV1();
    await this.save(items);
  }

  async #convertOnLoad(items: TodoItem[]): Promise<TaskLoad> {
    try {
      await this.#backUpV1();
    } catch (error) {
      if (!(error instanceof FileAccessError))
        throw error;
      return { items, mode: 'pendingConversion', notice: null, saveFailed: true };
    }
    try {
      await this.save(items);
    } catch (error) {
      if (!(error instanceof FileAccessError))
        throw error;
      return { items, mode: 'normal', notice: null, saveFailed: true };
    }
    return ready(items);
  }

  async #backUpV1(): Promise<void> {
    if (this.#v1BackedUp)
      return;
    await this.#files.copy(TASKS_FILE, await this.#freeName(V1_BACKUP_PREFIX));
    this.#v1BackedUp = true;
  }

  /** `prefix-yyyyMMdd-HHmmss.json`, 이미 있으면 `-2`, `-3`… (STORE-08, STORE-12). */
  async #freeName(prefix: string): Promise<string> {
    const base = `${prefix}-${this.#clock.now().compactStamp()}`;
    let name = `${base}.json`;
    for (let n = 2; await this.#files.exists(name); n++)
      name = `${base}-${n}.json`;
    return name;
  }

  #cannotOpen(error: unknown): CannotOpenError {
    const detail = error instanceof Error ? error.message : String(error);
    return new CannotOpenError(this.#files.displayPath(TASKS_FILE), detail, { cause: error });
  }
}

function ready(items: TodoItem[]): TaskLoad {
  return { items, mode: 'normal', notice: null, saveFailed: false };
}
