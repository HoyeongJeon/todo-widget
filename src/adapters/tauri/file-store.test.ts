import { describe, expect, it, vi } from 'vitest';
import { FileAccessError } from '../../application/ports/file-store.ts';
import { createTauriFileStore } from './file-store.ts';

function fakeInvoke(results: Record<string, unknown> = {}) {
  return vi.fn(async (command: string, _args?: Record<string, unknown>) => {
    if (command === 'data_dir_info')
      return { path: '/Users/me/Library/Application Support/TodoWidget', separator: '/' };
    const result = results[command];
    if (result instanceof Error)
      throw result.message; // Tauri는 Rust 오류를 문자열로 거부한다
    return result;
  });
}

describe('Tauri FileStore adapter', () => {
  it('명령 이름과 인자를 그대로 넘긴다', async () => {
    const invoke = fakeInvoke({ data_file_read: '{}', data_file_exists: true });
    const store = await createTauriFileStore(invoke);
    expect(await store.read('tasks.json')).toBe('{}');
    expect(await store.exists('settings.json')).toBe(true);
    await store.writeAtomic('tasks.json', '[]');
    await store.rename('tasks.json', 'b.json');
    await store.copy('b.json', 'c.json');
    expect(invoke.mock.calls.slice(1)).toEqual([
      ['data_file_read', { name: 'tasks.json' }],
      ['data_file_exists', { name: 'settings.json' }],
      ['data_file_write_atomic', { name: 'tasks.json', text: '[]' }],
      ['data_file_rename', { from: 'tasks.json', to: 'b.json' }],
      ['data_file_copy', { from: 'b.json', to: 'c.json' }],
    ]);
  });

  it('없는 파일은 null이다 (Rust None)', async () => {
    const store = await createTauriFileStore(fakeInvoke({ data_file_read: null }));
    expect(await store.read('tasks.json')).toBeNull();
  });

  it('STORE-10 Rust 오류 문자열은 메시지를 지닌 FileAccessError가 된다', async () => {
    const store = await createTauriFileStore(fakeInvoke({ data_file_read: new Error('tasks.json: 다른 프로세스가 사용 중') }));
    const error = await store.read('tasks.json').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FileAccessError);
    expect((error as Error).message).toBe('tasks.json: 다른 프로세스가 사용 중');
  });

  it('모든 명령의 거부를 FileAccessError로 바꾼다', async () => {
    const failing = new Error('잠김');
    const store = await createTauriFileStore(
      fakeInvoke({ data_file_write_atomic: failing, data_file_exists: failing, data_file_rename: failing, data_file_copy: failing }),
    );
    await expect(store.writeAtomic('a', 'x')).rejects.toBeInstanceOf(FileAccessError);
    await expect(store.exists('a')).rejects.toBeInstanceOf(FileAccessError);
    await expect(store.rename('a', 'b')).rejects.toBeInstanceOf(FileAccessError);
    await expect(store.copy('a', 'b')).rejects.toBeInstanceOf(FileAccessError);
  });

  it('STORE-10 대화 상자용 전체 경로는 데이터 폴더와 OS 구분자로 만든다', async () => {
    const store = await createTauriFileStore(fakeInvoke());
    expect(store.displayPath('tasks.json')).toBe('/Users/me/Library/Application Support/TodoWidget/tasks.json');
    const windows = vi.fn(async () => ({ path: 'C:\\Users\\me\\AppData\\Roaming\\TodoWidget\\', separator: '\\' }));
    expect((await createTauriFileStore(windows)).displayPath('tasks.json')).toBe('C:\\Users\\me\\AppData\\Roaming\\TodoWidget\\tasks.json');
  });
});
