import { beforeEach, describe, expect, it } from 'vitest';
import { FakeClock } from '../testing/fake-clock.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { sequenceIds } from '../testing/sequence-ids.ts';
import { TASKS_FILE, TaskRepository } from './storage/task-repository.ts';
import { TodoSession } from './todo-session.ts';

const V1 = JSON.stringify([{ id: 'a', title: '보고서', status: 'todo', createdAt: '2026-09-30 09:12:40', completedAt: null }]);

let files: MemoryFileStore;
let clock: FakeClock;

beforeEach(() => {
  files = new MemoryFileStore();
  clock = new FakeClock('2026-10-03T09:00:00+09:00');
});

function open(): Promise<TodoSession> {
  return TodoSession.open(new TaskRepository(files, clock), clock, sequenceIds());
}

function savedTitles(): string[] {
  return JSON.parse(files.files.get(TASKS_FILE) ?? '{"tasks":[]}').tasks.map((t: { title: string }) => t.title);
}

describe('저장', () => {
  it('STORE-01 바뀔 때마다 바로 전체 목록을 저장한다', async () => {
    const session = await open();
    expect(await session.add('보고서')).toBe(true);
    expect(savedTitles()).toEqual(['보고서']);
    const id = session.items[0]?.id ?? '';
    await session.cycle(id);
    await session.rename(id, '보고서 초안');
    await session.setStatus(id, 'done');
    expect(files.writes).toHaveLength(4);
    expect(JSON.parse(files.files.get(TASKS_FILE) ?? '').tasks[0]).toMatchObject({ title: '보고서 초안', status: 'done' });
    await session.remove(id);
    expect(savedTitles()).toEqual([]);
  });

  it('STORE-01 변경 없음이면 저장하지 않는다', async () => {
    const session = await open();
    await session.add('보고서');
    const id = session.items[0]?.id ?? '';
    expect(await session.rename(id, ' 보고서 ')).toBe(false);
    expect(await session.cycle('없음')).toBe(false);
    expect(await session.add('   ')).toBe(false);
    expect(await session.clear()).toBe(true);
    expect(await session.clear()).toBe(false);
    expect(files.writes).toHaveLength(2);
  });

  it('STORE-01 여러 줄을 한꺼번에 추가해도 저장은 한 번이다', async () => {
    const session = await open();
    await session.add('은행\n택배\n보고서');
    expect(files.writes).toHaveLength(1);
    expect(savedTitles()).toEqual(['은행', '택배', '보고서']);
  });

  it('STORE-01 기다리지 않고 연달아 바꿔도 마지막에는 모든 변경이 저장된다', async () => {
    const session = await open();
    await Promise.all([session.add('하나'), session.add('둘'), session.add('셋')]);
    expect(savedTitles()).toEqual(['하나', '둘', '셋']);
  });

  it('바뀌면 화면에 알린다', async () => {
    const session = await open();
    let calls = 0;
    const stop = session.onChange(() => calls++);
    await session.add('보고서');
    expect(calls).toBeGreaterThan(0);
    stop();
    const before = calls;
    await session.add('택배');
    expect(calls).toBe(before);
  });
});

describe('저장 실패와 파일 문제', () => {
  it('STORE-11 저장에 실패해도 바꾼 내용은 남고, 다음 변경 때 전체를 다시 저장하고 성공하면 안내를 지운다', async () => {
    const session = await open();
    files.failWrites = true;
    expect(await session.add('보고서')).toBe(true);
    expect(session.items.map((i) => i.title)).toEqual(['보고서']);
    expect(session.saveFailed).toBe(true);

    expect(await session.cycle('없음')).toBe(false);
    expect(session.saveFailed).toBe(true);

    files.failWrites = false;
    await session.add('택배');
    expect(savedTitles()).toEqual(['보고서', '택배']);
    expect(session.saveFailed).toBe(false);
  });

  it('STORE-13 v1 백업에 실패했으면 바꿀 때마다 변환을 다시 시도하고, 성공하면 안내를 지운다', async () => {
    files.files.set(TASKS_FILE, V1);
    files.failCopy = true;
    const session = await open();
    expect(session.saveFailed).toBe(true);
    expect(session.items.map((i) => i.title)).toEqual(['보고서']);

    await session.add('택배');
    expect(session.saveFailed).toBe(true);
    expect(files.files.get(TASKS_FILE)).toBe(V1);

    files.failCopy = false;
    await session.add('은행');
    expect(session.saveFailed).toBe(false);
    expect(files.files.get('tasks.v1-backup-20261003-090000.json')).toBe(V1);
    expect(savedTitles()).toEqual(['보고서', '택배', '은행']);

    await session.add('하나 더');
    expect([...files.files.keys()].filter((k) => k.startsWith('tasks.v1-backup'))).toHaveLength(1);
  });

  it('STORE-14 새 버전 파일이면 바꿔도 저장하지 않고 저장 실패로도 보지 않는다', async () => {
    const newer = '{"version":3,"tasks":[]}';
    files.files.set(TASKS_FILE, newer);
    const session = await open();
    expect(session.fileNotice).toBe('newerFile');
    expect(await session.add('보고서')).toBe(true);
    expect(session.items).toHaveLength(1);
    expect(session.saveFailed).toBe(false);
    expect(files.files.get(TASKS_FILE)).toBe(newer);
    expect(files.writes).toEqual([]);
  });

  it('STORE-08 깨진 파일을 백업했으면 다시 켤 때까지 백업 안내가 남는다', async () => {
    files.files.set(TASKS_FILE, '{깨짐');
    const session = await open();
    expect(session.fileNotice).toBe('backup');
    await session.add('보고서');
    expect(session.fileNotice).toBe('backup');
    expect(savedTitles()).toEqual(['보고서']);
  });
});
