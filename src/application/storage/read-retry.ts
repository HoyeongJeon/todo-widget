import { FileAccessError, type FileStore } from '../ports/file-store.ts';
import type { Timer } from '../ports/timer.ts';

export const READ_RETRIES = 3;
export const READ_RETRY_DELAY_MS = 100;

/**
 * 읽기에 실패하면 잠깐 기다렸다가 다시 읽는 데이터 폴더 (STORE-20).
 * 백신 검사나 동기화 프로그램의 잠금은 대개 아주 짧아서, 한 번 실패로 STORE-10·STORE-15를 따르지 않으려는 것이다.
 * 파일이 없을 때(null)와 FileAccessError가 아닌 오류는 다시 읽지 않는다. 읽기 말고는 그대로 넘긴다.
 */
export class RetryingFileStore implements FileStore {
  readonly #files: FileStore;
  readonly #timer: Timer;

  constructor(files: FileStore, timer: Timer) {
    this.#files = files;
    this.#timer = timer;
  }

  async read(name: string): Promise<string | null> {
    for (let retry = 0; ; retry++) {
      try {
        return await this.#files.read(name);
      } catch (error) {
        if (!(error instanceof FileAccessError) || retry >= READ_RETRIES)
          throw error;
      }
      await new Promise<void>((resolve) => this.#timer.schedule(READ_RETRY_DELAY_MS, resolve));
    }
  }

  writeAtomic(name: string, text: string): Promise<void> {
    return this.#files.writeAtomic(name, text);
  }

  exists(name: string): Promise<boolean> {
    return this.#files.exists(name);
  }

  rename(from: string, to: string): Promise<void> {
    return this.#files.rename(from, to);
  }

  copy(from: string, to: string): Promise<void> {
    return this.#files.copy(from, to);
  }

  displayPath(name: string): string {
    return this.#files.displayPath(name);
  }
}
