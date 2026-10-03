import { FileAccessError, type FileStore } from '../application/ports/file-store.ts';

/** 테스트용 메모리 데이터 폴더. 실패를 일부러 낼 수 있다. */
export class MemoryFileStore implements FileStore {
  readonly files = new Map<string, string>();
  readonly unreadable = new Set<string>();
  readonly writes: string[] = [];
  failWrites = false;
  failCopy = false;
  failRename = false;

  async read(name: string): Promise<string | null> {
    if (this.unreadable.has(name))
      throw new FileAccessError(`${name}을 읽지 못했어요 (잠김)`);
    return this.files.get(name) ?? null;
  }

  async writeAtomic(name: string, text: string): Promise<void> {
    if (this.failWrites)
      throw new FileAccessError(`${name}을 쓰지 못했어요`);
    this.files.set(name, text);
    this.writes.push(name);
  }

  async exists(name: string): Promise<boolean> {
    return this.files.has(name);
  }

  async rename(from: string, to: string): Promise<void> {
    const text = this.files.get(from);
    if (this.failRename || text === undefined || this.files.has(to))
      throw new FileAccessError(`${from}의 이름을 바꾸지 못했어요`);
    this.files.delete(from);
    this.files.set(to, text);
  }

  async copy(from: string, to: string): Promise<void> {
    const text = this.files.get(from);
    if (this.failCopy || text === undefined || this.files.has(to))
      throw new FileAccessError(`${from}을 복사하지 못했어요`);
    this.files.set(to, text);
  }

  displayPath(name: string): string {
    return `/data/${name}`;
  }
}
