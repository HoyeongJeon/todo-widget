import { beforeEach, describe, expect, it } from 'vitest';
import { ImmediateTimer } from '../../testing/immediate-timer.ts';
import { MemoryFileStore } from '../../testing/memory-file-store.ts';
import { FileAccessError } from '../ports/file-store.ts';
import { READ_RETRIES, READ_RETRY_DELAY_MS, RetryingFileStore } from './read-retry.ts';

let files: MemoryFileStore;
let timer: ImmediateTimer;
let store: RetryingFileStore;

beforeEach(() => {
  files = new MemoryFileStore();
  timer = new ImmediateTimer();
  store = new RetryingFileStore(files, timer);
});

describe('읽기 다시 시도', () => {
  it('STORE-20 100밀리초 간격으로 세 번까지 다시 읽는다', () => {
    expect(READ_RETRIES).toBe(3);
    expect(READ_RETRY_DELAY_MS).toBe(100);
  });

  it('STORE-20 잠깐 잠겨 읽지 못해도 다시 읽어 성공하면 그 내용을 돌려준다', async () => {
    files.files.set('a.json', '{}');
    files.readFailures.set('a.json', 2);
    expect(await store.read('a.json')).toBe('{}');
    expect(files.readAttempts).toEqual(['a.json', 'a.json', 'a.json']);
    expect(timer.delays).toEqual([100, 100]);
  });

  it('STORE-20 처음 한 번과 다시 읽기 세 번이 모두 실패하면 마지막 오류를 그대로 던진다', async () => {
    files.files.set('a.json', '{}');
    files.unreadable.add('a.json');
    await expect(store.read('a.json')).rejects.toBeInstanceOf(FileAccessError);
    expect(files.readAttempts).toHaveLength(4);
    expect(timer.delays).toEqual([100, 100, 100]);
  });

  it('STORE-20 파일이 없거나 읽히면 다시 읽지 않는다', async () => {
    files.files.set('a.json', '깨진 내용');
    expect(await store.read('a.json')).toBe('깨진 내용');
    expect(await store.read('없음.json')).toBeNull();
    expect(files.readAttempts).toEqual(['a.json', '없음.json']);
    expect(timer.delays).toEqual([]);
  });

  it('FileAccessError가 아닌 오류는 다시 읽지 않는다', async () => {
    const broken = new MemoryFileStore();
    broken.read = async () => {
      throw new TypeError('버그');
    };
    await expect(new RetryingFileStore(broken, timer).read('a.json')).rejects.toBeInstanceOf(TypeError);
    expect(timer.delays).toEqual([]);
  });

  it('읽기 말고는 그대로 넘긴다', async () => {
    await store.writeAtomic('a.json', '1');
    await store.copy('a.json', 'b.json');
    await store.rename('b.json', 'c.json');
    expect(await store.exists('c.json')).toBe(true);
    expect(store.displayPath('a.json')).toBe('/data/a.json');
    expect([...files.files.keys()].sort()).toEqual(['a.json', 'c.json']);
  });
});
