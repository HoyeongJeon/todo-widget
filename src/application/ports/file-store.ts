/** 데이터 폴더 안의 파일을 읽고 쓰는 일이 실패했다. */
export class FileAccessError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'FileAccessError';
  }
}

/**
 * 데이터 폴더(WIN-01, MAC-01, STORE-18)의 파일. `name`은 폴더 안의 파일 이름이다.
 * 실제 구현은 계획 4의 Rust 명령이다.
 */
export interface FileStore {
  /** 없으면 null. 있는데 읽지 못하면 FileAccessError. */
  read(name: string): Promise<string | null>;
  /** 임시 파일에 쓰고 flush한 뒤 원본과 바꾼다. 폴더가 없으면 만든다 (STORE-02). 실패하면 FileAccessError. */
  writeAtomic(name: string, text: string): Promise<void>;
  /** 있는지 확인하지 못하면 FileAccessError. */
  exists(name: string): Promise<boolean>;
  /** `to`가 이미 있으면 덮어쓰지 않고 실패한다. 호출하는 쪽이 빈 이름을 먼저 고른다. 실패하면 FileAccessError. */
  rename(from: string, to: string): Promise<void>;
  /** `to`가 이미 있으면 덮어쓰지 않고 실패한다. 호출하는 쪽이 빈 이름을 먼저 고른다. 실패하면 FileAccessError. */
  copy(from: string, to: string): Promise<void>;
  /** 대화 상자에 보여 줄 전체 경로 (STORE-10). */
  displayPath(name: string): string;
}
