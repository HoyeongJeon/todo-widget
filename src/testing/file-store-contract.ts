import { describe, expect, it } from 'vitest';
import { FileAccessError, type FileStore } from '../application/ports/file-store.ts';

export type SeedableFileStore = FileStore & { seed(name: string, text: string): Promise<void> };

/**
 * FileStore가 지켜야 하는 계약. 가짜(MemoryFileStore)는 이 테스트로, 진짜(Rust DataDir)는
 * src-tauri/crates/core/src/files.rs의 같은 경우 테스트로 확인한다. 한쪽을 바꾸면 다른 쪽도 바꾼다.
 */
export function describeFileStoreContract(name: string, makeStore: () => Promise<SeedableFileStore>): void {
  describe(`${name}: FileStore 계약`, () => {
    it('없는 파일은 null로 읽는다', async () => {
      const store = await makeStore();
      expect(await store.read('tasks.json')).toBeNull();
      expect(await store.exists('tasks.json')).toBe(false);
    });

    it('STORE-02 쓴 내용을 그대로 읽는다', async () => {
      const store = await makeStore();
      await store.writeAtomic('tasks.json', '보고서');
      await store.writeAtomic('tasks.json', '은행');
      expect(await store.read('tasks.json')).toBe('은행');
      expect(await store.exists('tasks.json')).toBe(true);
    });

    it('이름 바꾸기와 복사는 대상이 있으면 덮어쓰지 않고 FileAccessError로 실패한다', async () => {
      const store = await makeStore();
      await store.seed('tasks.json', '원본');
      await store.seed('backup.json', '먼저');
      await expect(store.rename('tasks.json', 'backup.json')).rejects.toBeInstanceOf(FileAccessError);
      await expect(store.copy('tasks.json', 'backup.json')).rejects.toBeInstanceOf(FileAccessError);
      expect(await store.read('tasks.json')).toBe('원본');
      expect(await store.read('backup.json')).toBe('먼저');
    });

    it('이름 바꾸기는 옮기고, 복사는 원본을 남긴다', async () => {
      const store = await makeStore();
      await store.seed('tasks.json', '원본');
      await store.copy('tasks.json', 'copy.json');
      await store.rename('tasks.json', 'moved.json');
      expect(await store.read('tasks.json')).toBeNull();
      expect(await store.read('copy.json')).toBe('원본');
      expect(await store.read('moved.json')).toBe('원본');
    });

    it('없는 파일의 이름 바꾸기와 복사는 FileAccessError로 실패한다', async () => {
      const store = await makeStore();
      await expect(store.rename('none.json', 'a.json')).rejects.toBeInstanceOf(FileAccessError);
      await expect(store.copy('none.json', 'b.json')).rejects.toBeInstanceOf(FileAccessError);
    });
  });
}
