import { beforeEach, describe, expect, it } from 'vitest';
import { FakeClock, ts } from '../../testing/fake-clock.ts';
import { MemoryFileStore } from '../../testing/memory-file-store.ts';
import { CannotOpenError, TASKS_FILE, TaskRepository } from './task-repository.ts';
import { encodeTasks } from './tasks-codec.ts';

const V1 = JSON.stringify([
  { id: 'a', title: '보고서 초안 쓰기', status: 'doing', createdAt: '2026-09-30 09:12:40', completedAt: null },
  { id: 'b', title: '은행 방문', status: 'done', createdAt: '2026-09-29 08:00:00', completedAt: '2026-09-30 14:05:00' },
]);
const V2 = encodeTasks([{ id: 'x', title: '할 일', status: 'todo', createdAt: ts('2026-10-03T08:00:00+09:00'), completedAt: null }]);

let files: MemoryFileStore;
let repo: TaskRepository;

beforeEach(() => {
  files = new MemoryFileStore();
  repo = new TaskRepository(files, new FakeClock('2026-10-03T09:00:00+09:00'));
});

describe('불러오기', () => {
  it('STORE-07 tasks.json이 없으면 빈 목록이고 아무것도 쓰지 않는다', async () => {
    expect(await repo.load()).toEqual({ items: [], mode: 'normal', notice: null, saveFailed: false });
    expect(files.files.size).toBe(0);
  });

  it('v2 파일은 그대로 읽는다', async () => {
    files.files.set(TASKS_FILE, V2);
    const load = await repo.load();
    expect(load.items.map((i) => i.title)).toEqual(['할 일']);
    expect(load.mode).toBe('normal');
    expect([...files.files.keys()]).toEqual([TASKS_FILE]);
  });

  it('STORE-08 깨진 파일은 내용 그대로 이름만 바꾸고 빈 목록과 백업 안내로 시작한다', async () => {
    files.files.set(TASKS_FILE, '{깨짐');
    expect(await repo.load()).toEqual({ items: [], mode: 'normal', notice: 'backup', saveFailed: false });
    expect(files.files.has(TASKS_FILE)).toBe(false);
    expect(files.files.get('tasks.broken-20261003-090000.json')).toBe('{깨짐');
  });

  it('STORE-08 같은 이름의 백업이 있으면 -2, -3을 붙여 덮어쓰지 않는다', async () => {
    files.files.set('tasks.broken-20261003-090000.json', '첫 백업');
    files.files.set('tasks.broken-20261003-090000-2.json', '둘째 백업');
    files.files.set(TASKS_FILE, '{깨짐');
    await repo.load();
    expect(files.files.get('tasks.broken-20261003-090000.json')).toBe('첫 백업');
    expect(files.files.get('tasks.broken-20261003-090000-2.json')).toBe('둘째 백업');
    expect(files.files.get('tasks.broken-20261003-090000-3.json')).toBe('{깨짐');
  });

  it('STORE-10 읽지 못하는 tasks.json은 덮어쓰지 않고 경로와 이유를 담아 알린다', async () => {
    files.files.set(TASKS_FILE, V2);
    files.unreadable.add(TASKS_FILE);
    const error = await repo.load().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CannotOpenError);
    expect((error as CannotOpenError).path).toBe('/data/tasks.json');
    expect((error as CannotOpenError).detail).toContain('읽지 못했어요');
    expect(files.files.get(TASKS_FILE)).toBe(V2);
  });

  it('STORE-10 깨진 파일의 이름을 바꾸지 못하면 같은 방식으로 알리고 원본을 남긴다', async () => {
    files.files.set(TASKS_FILE, '{깨짐');
    files.failRename = true;
    await expect(repo.load()).rejects.toBeInstanceOf(CannotOpenError);
    expect(files.files.get(TASKS_FILE)).toBe('{깨짐');
  });

  it('STORE-12 v1.4 파일은 백업을 복사하고 v2로 바꿔 저장한다', async () => {
    files.files.set(TASKS_FILE, V1);
    const load = await repo.load();
    expect(load).toMatchObject({ mode: 'normal', notice: null, saveFailed: false });
    expect(load.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(files.files.get('tasks.v1-backup-20261003-090000.json')).toBe(V1);
    expect(JSON.parse(files.files.get(TASKS_FILE) ?? '')).toEqual(JSON.parse(encodeTasks(load.items)));
    expect(JSON.parse(files.files.get(TASKS_FILE) ?? '').tasks[1].completedAt).toBe('2026-09-30T14:05:00+09:00');
  });

  it('STORE-12 v1 백업 이름이 겹치면 -2를 붙이고, 이미 v2면 백업도 변환도 하지 않는다', async () => {
    files.files.set('tasks.v1-backup-20261003-090000.json', '예전 백업');
    files.files.set(TASKS_FILE, V1);
    await repo.load();
    expect(files.files.get('tasks.v1-backup-20261003-090000-2.json')).toBe(V1);

    const fresh = new MemoryFileStore();
    fresh.files.set(TASKS_FILE, V2);
    await new TaskRepository(fresh, new FakeClock()).load();
    expect([...fresh.files.keys()]).toEqual([TASKS_FILE]);
    expect(fresh.writes).toEqual([]);
  });

  it('STORE-12 v1 형식인데 깨졌으면 변환하지 않고 STORE-08을 따른다', async () => {
    files.files.set(TASKS_FILE, JSON.stringify([{ id: 'a', title: '보고서', status: 'todo', createdAt: '어제' }]));
    const load = await repo.load();
    expect(load.notice).toBe('backup');
    expect([...files.files.keys()].some((k) => k.startsWith('tasks.v1-backup'))).toBe(false);
  });

  it('STORE-12 백업은 했지만 변환한 내용을 저장하지 못하면 저장 실패로 시작한다', async () => {
    files.files.set(TASKS_FILE, V1);
    files.failWrites = true;
    const load = await repo.load();
    expect(load).toMatchObject({ mode: 'normal', saveFailed: true });
    expect(load.items).toHaveLength(2);
    expect(files.files.get(TASKS_FILE)).toBe(V1);
    expect(files.files.get('tasks.v1-backup-20261003-090000.json')).toBe(V1);
  });

  it('STORE-13 변환용 백업에 실패하면 변환하지 않고 할 일만 보여 준다', async () => {
    files.files.set(TASKS_FILE, V1);
    files.failCopy = true;
    const load = await repo.load();
    expect(load).toMatchObject({ mode: 'pendingConversion', notice: null, saveFailed: true });
    expect(load.items).toHaveLength(2);
    expect(files.files.get(TASKS_FILE)).toBe(V1);
    expect(files.writes).toEqual([]);
  });

  it('STORE-14 더 새 버전 파일은 읽지도, 바꾸지도, 백업하지도 않는다', async () => {
    const newer = '{"version":3,"tasks":[]}';
    files.files.set(TASKS_FILE, newer);
    expect(await repo.load()).toEqual({ items: [], mode: 'readOnly', notice: 'newerFile', saveFailed: false });
    expect([...files.files.entries()]).toEqual([[TASKS_FILE, newer]]);
  });
});

describe('저장', () => {
  it('save는 v2 형식으로 tasks.json에 쓴다', async () => {
    const items = [{ id: 'x', title: '할 일', status: 'todo' as const, createdAt: ts('2026-10-03T08:00:00+09:00'), completedAt: null }];
    await repo.save(items);
    expect(files.files.get(TASKS_FILE)).toBe(encodeTasks(items));
  });
});
