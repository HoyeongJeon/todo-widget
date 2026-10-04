import { FileAccessError, type FileStore } from '../../application/ports/file-store.ts';
import type { Invoke } from './invoke.ts';

interface DataDirInfo {
  path: string;
  separator: string;
}

/**
 * 데이터 폴더 파일을 Rust 명령(`src-tauri/src/commands/files.rs`)으로 읽고 쓴다.
 * 데이터 폴더 위치는 Rust가 정한다(WIN-01, MAC-01, STORE-18). Tauri는 Rust 오류를 문자열로 거부하므로 모두 FileAccessError로 바꾼다.
 */
export async function createTauriFileStore(invoke: Invoke): Promise<FileStore> {
  const dir = (await invoke('data_dir_info')) as DataDirInfo;
  const prefix = dir.path.endsWith(dir.separator) ? dir.path : dir.path + dir.separator;

  async function call<T>(command: string, args: Record<string, unknown>): Promise<T> {
    try {
      return (await invoke(command, args)) as T;
    } catch (error) {
      throw new FileAccessError(error instanceof Error ? error.message : String(error), { cause: error });
    }
  }

  return {
    read: (name) => call<string | null>('data_file_read', { name }),
    writeAtomic: (name, text) => call<void>('data_file_write_atomic', { name, text }),
    exists: (name) => call<boolean>('data_file_exists', { name }),
    rename: (from, to) => call<void>('data_file_rename', { from, to }),
    copy: (from, to) => call<void>('data_file_copy', { from, to }),
    displayPath: (name) => prefix + name,
  };
}
