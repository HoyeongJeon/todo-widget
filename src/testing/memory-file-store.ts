import { FileAccessError, type FileStore } from '../application/ports/file-store.ts';

/**
 * 테스트용 메모리 데이터 폴더. 실패를 일부러 낼 수 있다.
 * `writeGate`를 주면 그 약속이 끝날 때까지 쓰기가 멈춰 있다(쓰는 내용은 부른 때의 것이다).
 */
export class MemoryFileStore implements FileStore {
  readonly files = new Map<string, string>();
  readonly unreadable = new Set<string>();
  /** 이름마다 남은 횟수만큼 읽기가 실패한 뒤 성공한다. 잠깐 잠긴 파일이다. */
  readonly readFailures = new Map<string, number>();
  /** 실패한 것까지 모든 읽기 시도. */
  readonly readAttempts: string[] = [];
  /** 성공한 쓰기. */
  readonly writes: string[] = [];
  /** 실패한 것까지 모든 쓰기 시도. */
  readonly writeAttempts: string[] = [];
  writeGate: Promise<void> | null = null;
  failWrites = false;
  failCopy = false;
  failRename = false;

  async read(name: string): Promise<string | null> {
    this.readAttempts.push(name);
    const failuresLeft = this.readFailures.get(name) ?? 0;
    if (failuresLeft > 0)
      this.readFailures.set(name, failuresLeft - 1);
    if (this.unreadable.has(name) || failuresLeft > 0)
      throw new FileAccessError(`${name}을 읽지 못했어요 (잠김)`);
    return this.files.get(name) ?? null;
  }

  async writeAtomic(name: string, text: string): Promise<void> {
    this.writeAttempts.push(name);
    if (this.writeGate)
      await this.writeGate;
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
