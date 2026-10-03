import { beforeEach, describe, expect, it } from 'vitest';
import { FakeClock } from '../testing/fake-clock.ts';
import { flush } from '../testing/fake-timer.ts';
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

/** 쓰기를 멈춰 두고, 돌려준 함수를 부르면 풀어 준다. */
function gateWrites(): () => void {
  let release = (): void => undefined;
  files.writeGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return release;
}

describe('저장', () => {
  it('STORE-01 바뀔 때마다 바로 전체 목록을 저장한다', async () => {
    const session = await open();
    expect(session.add('보고서')).toBe(true);
    await session.whenSaved();
    expect(savedTitles()).toEqual(['보고서']);
    const id = session.items[0]?.id ?? '';
    expect(session.cycle(id)).toBe(true);
    await session.whenSaved();
    expect(session.rename(id, '보고서 초안')).toBe(true);
    await session.whenSaved();
    expect(session.setStatus(id, 'done')).toBe(true);
    await session.whenSaved();
    expect(files.writes).toHaveLength(4);
    expect(JSON.parse(files.files.get(TASKS_FILE) ?? '').tasks[0]).toMatchObject({ title: '보고서 초안', status: 'done' });
    expect(session.remove(id)).toBe(true);
    await session.whenSaved();
    expect(savedTitles()).toEqual([]);
  });

  it('STORE-01 변경 없음이면 저장하지 않는다', async () => {
    const session = await open();
    expect(session.add('보고서')).toBe(true);
    const id = session.items[0]?.id ?? '';
    expect(session.rename(id, ' 보고서 ')).toBe(false);
    expect(session.cycle('없음')).toBe(false);
    expect(session.add('   ')).toBe(false);
    expect(session.clear()).toBe(true);
    expect(session.clear()).toBe(false);
    await session.whenSaved();
    expect(files.writeAttempts).toHaveLength(2);
  });

  it('STORE-01 여러 줄을 한꺼번에 추가해도 저장은 한 번이다', async () => {
    const session = await open();
    expect(session.add('은행\n택배\n보고서')).toBe(true);
    await session.whenSaved();
    expect(files.writes).toHaveLength(1);
    expect(savedTitles()).toEqual(['은행', '택배', '보고서']);
  });

  it('STORE-01 바뀌었는지는 저장이 끝나기 전에 바로 알 수 있다', async () => {
    const session = await open();
    const release = gateWrites();
    expect(session.add('보고서')).toBe(true);
    expect(session.items.map((i) => i.title)).toEqual(['보고서']);
    await flush();
    expect(files.files.has(TASKS_FILE)).toBe(false);
    release();
    await session.whenSaved();
    expect(savedTitles()).toEqual(['보고서']);
  });

  it('STORE-01 whenSaved는 늦게 끝나는 저장까지 기다린다', async () => {
    const session = await open();
    const release = gateWrites();
    session.add('보고서');
    let saved = false;
    const waiting = session.whenSaved().then(() => {
      saved = true;
    });
    await flush();
    expect(saved).toBe(false);
    release();
    await waiting;
    expect(saved).toBe(true);
    expect(savedTitles()).toEqual(['보고서']);
  });

  it('STORE-01 앞선 저장이 늦게 끝나도 연달아 바꾼 내용은 차례로 저장해 마지막에는 모든 변경이 남는다', async () => {
    const session = await open();
    const release = gateWrites();
    session.add('하나');
    await flush();
    expect(files.writeAttempts).toHaveLength(1);
    files.writeGate = null;
    session.add('둘');
    session.add('셋');
    await flush();
    expect(files.writeAttempts).toHaveLength(1);
    release();
    await session.whenSaved();
    expect(files.writes).toHaveLength(3);
    expect(savedTitles()).toEqual(['하나', '둘', '셋']);
  });

  it('바뀌면 화면에 알린다', async () => {
    const session = await open();
    let calls = 0;
    const stop = session.onChange(() => calls++);
    session.add('보고서');
    expect(calls).toBeGreaterThan(0);
    stop();
    const before = calls;
    session.add('택배');
    await session.whenSaved();
    expect(calls).toBe(before);
  });

  it('STORE-01 화면 알림에서 오류가 나도 저장하고 다른 알림도 받는다', async () => {
    const session = await open();
    let calls = 0;
    session.onChange(() => {
      throw new Error('화면 오류');
    });
    session.onChange(() => calls++);
    expect(session.add('보고서')).toBe(true);
    await session.whenSaved();
    expect(savedTitles()).toEqual(['보고서']);
    expect(calls).toBeGreaterThan(0);
  });

  it('저장에서 예상 못 한 오류가 나면 whenSaved가 한 번 알리고, 다음 저장은 이어진다', async () => {
    const session = await open();
    const write = files.writeAtomic.bind(files);
    files.writeAtomic = async () => {
      throw new Error('예상 못 한 오류');
    };
    session.add('보고서');
    await expect(session.whenSaved()).rejects.toThrow('예상 못 한 오류');
    expect(session.saveFailed).toBe(false);
    await expect(session.whenSaved()).resolves.toBeUndefined();

    files.writeAtomic = write;
    session.add('택배');
    await expect(session.whenSaved()).resolves.toBeUndefined();
    expect(savedTitles()).toEqual(['보고서', '택배']);
  });
});

describe('저장 실패와 파일 문제', () => {
  it('STORE-11 저장에 실패해도 바꾼 내용은 남고, 다음 변경 때 전체를 다시 저장하고 성공하면 안내를 지운다', async () => {
    const session = await open();
    files.failWrites = true;
    expect(session.add('보고서')).toBe(true);
    await session.whenSaved();
    expect(session.items.map((i) => i.title)).toEqual(['보고서']);
    expect(session.saveFailed).toBe(true);
    expect(files.writeAttempts).toHaveLength(1);

    expect(session.cycle('없음')).toBe(false);
    await session.whenSaved();
    expect(files.writeAttempts).toHaveLength(1);
    expect(session.saveFailed).toBe(true);

    files.failWrites = false;
    session.add('택배');
    await session.whenSaved();
    expect(files.writeAttempts).toHaveLength(2);
    expect(savedTitles()).toEqual(['보고서', '택배']);
    expect(session.saveFailed).toBe(false);
  });

  it('STORE-13 v1 백업에 실패했으면 바꿀 때마다 변환을 다시 시도하고, 성공하면 안내를 지운다', async () => {
    files.files.set(TASKS_FILE, V1);
    files.failCopy = true;
    const session = await open();
    expect(session.saveFailed).toBe(true);
    expect(session.items.map((i) => i.title)).toEqual(['보고서']);

    session.add('택배');
    await session.whenSaved();
    expect(session.saveFailed).toBe(true);
    expect(files.files.get(TASKS_FILE)).toBe(V1);

    files.failCopy = false;
    session.add('은행');
    await session.whenSaved();
    expect(session.saveFailed).toBe(false);
    expect(files.files.get('tasks.v1-backup-20261003-090000.json')).toBe(V1);
    expect(savedTitles()).toEqual(['보고서', '택배', '은행']);

    session.add('하나 더');
    await session.whenSaved();
    expect([...files.files.keys()].filter((k) => k.startsWith('tasks.v1-backup'))).toHaveLength(1);
  });

  it('STORE-14 새 버전 파일이면 바꿔도 저장하지 않고 저장 실패로도 보지 않는다', async () => {
    const newer = '{"version":3,"tasks":[]}';
    files.files.set(TASKS_FILE, newer);
    const session = await open();
    expect(session.fileProblem).toBe('newerFile');
    expect(session.add('보고서')).toBe(true);
    await session.whenSaved();
    expect(session.items).toHaveLength(1);
    expect(session.saveFailed).toBe(false);
    expect(files.files.get(TASKS_FILE)).toBe(newer);
    expect(files.writeAttempts).toEqual([]);
  });

  it('STORE-08 깨진 파일을 백업했으면 다시 켤 때까지 백업 안내가 남는다', async () => {
    files.files.set(TASKS_FILE, '{깨짐');
    const session = await open();
    expect(session.fileProblem).toBe('backup');
    session.add('보고서');
    await session.whenSaved();
    expect(session.fileProblem).toBe('backup');
    expect(savedTitles()).toEqual(['보고서']);
  });
});
