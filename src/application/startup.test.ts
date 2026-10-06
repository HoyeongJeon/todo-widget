import { beforeEach, describe, expect, it } from 'vitest';
import { FakeAutoStart } from '../testing/fake-auto-start.ts';
import { FakeClock } from '../testing/fake-clock.ts';
import { ImmediateTimer } from '../testing/immediate-timer.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { sequenceIds } from '../testing/sequence-ids.ts';
import { FileAccessError } from './ports/file-store.ts';
import { SETTINGS_FILE } from './settings/settings-repository.ts';
import { TASKS_FILE } from './storage/task-repository.ts';
import { type StartupResult, startApp } from './startup.ts';

/** settings.json이 있는지 확인하는 일만 실패한다. */
class SettingsExistsUnknownFileStore extends MemoryFileStore {
  override async exists(name: string): Promise<boolean> {
    if (name === SETTINGS_FILE)
      throw new FileAccessError('있는지 확인하지 못했어요');
    return super.exists(name);
  }
}

let files: MemoryFileStore;
let autoStart: FakeAutoStart;

beforeEach(() => {
  files = new MemoryFileStore();
  autoStart = new FakeAutoStart();
});

function start(isDevBuild = false): Promise<StartupResult> {
  return startApp({ files, clock: new FakeClock(), timer: new ImmediateTimer(), newId: sequenceIds(), autoStart, appInfo: { version: '2.0.0', isDevBuild } });
}

describe('시작', () => {
  it('START-02 settings.json이 없으면 처음 실행이라 자동 실행을 켜고 기본 설정 파일을 만든다', async () => {
    const result = await start();
    expect(result.kind).toBe('ready');
    expect(autoStart.calls).toEqual(['enable']);
    expect(JSON.parse(files.files.get(SETTINGS_FILE) ?? '')).toMatchObject({ pinned: true, doneExpanded: false, todoExpanded: true });
  });

  it('START-03 처음 실행이 아니면 켜지 않고 등록 경로만 갱신한다', async () => {
    files.files.set(SETTINGS_FILE, '{"pinned": false}');
    await start();
    expect(autoStart.calls).toEqual(['refresh']);
    expect(files.writes).toEqual([]);
  });

  it('START-03 settings.json이 있는지 알 수 없으면 처음 실행으로 보지 않아, 켜지 않고 갱신만 하며 설정 파일도 만들지 않는다', async () => {
    files = new SettingsExistsUnknownFileStore();
    const result = await start();
    expect(result.kind).toBe('ready');
    expect(autoStart.calls).toEqual(['refresh']);
    expect(files.files.has(SETTINGS_FILE)).toBe(false);
    expect(files.writes).toEqual([]);
  });

  it('START-06 자동 실행 등록이나 첫 설정 저장이 실패해도 위젯은 뜬다', async () => {
    autoStart.failEnable = true;
    files.failWrites = true;
    const result = await start();
    expect(result.kind).toBe('ready');

    files.files.set(SETTINGS_FILE, '{}');
    autoStart.failRefresh = true;
    expect((await start()).kind).toBe('ready');
  });

  it('START-07 개발 빌드는 자동 실행을 건드리지 않지만 첫 설정 파일은 만든다', async () => {
    await start(true);
    expect(autoStart.calls).toEqual([]);
    expect(files.files.has(SETTINGS_FILE)).toBe(true);
  });

  it('PERF-01 자동 실행 등록을 기다리지 않고 준비를 마친다', async () => {
    autoStart.gate = new Promise(() => undefined);
    const result = await start();
    expect(result.kind).toBe('ready');
    expect(autoStart.calls).toEqual(['enable']);
    expect(JSON.parse(files.files.get(SETTINGS_FILE) ?? '')).toMatchObject({ pinned: true });
  });

  it('START-06 자동 실행이 끝나기를 기다리는 약속은 실패해도 거부되지 않는다', async () => {
    autoStart.failEnable = true;
    const result = await start();
    if (result.kind !== 'ready')
      throw new Error('준비되지 않았어요');
    await expect(result.autoStartDone).resolves.toBeUndefined();
  });

  it('STORE-10 tasks.json을 읽지 못하면 위젯을 띄우지 않고, 자동 실행과 첫 설정 파일도 건드리지 않는다', async () => {
    files.files.set(TASKS_FILE, '{"version":2,"tasks":[]}');
    files.unreadable.add(TASKS_FILE);
    const result = await start();
    expect(result).toEqual({ kind: 'cannotOpen', path: '/data/tasks.json', detail: expect.stringContaining('읽지 못했어요') });
    expect(autoStart.calls).toEqual([]);
    expect(files.files.has(SETTINGS_FILE)).toBe(false);
  });

  it('STORE-20 켤 때 tasks.json과 settings.json이 잠깐 잠겨 있어도 다시 읽어서 평소처럼 뜬다', async () => {
    files.files.set(TASKS_FILE, '{"version":2,"tasks":[{"id":"a","title":"보고서","status":"todo","createdAt":"2026-10-03T09:00:00+09:00","completedAt":null}]}');
    files.files.set(SETTINGS_FILE, '{"pinned": false}');
    files.readFailures.set(TASKS_FILE, 3);
    files.readFailures.set(SETTINGS_FILE, 3);
    const result = await start();
    if (result.kind !== 'ready')
      throw new Error('준비되지 않았어요');
    expect(result.session.items.map((i) => i.title)).toEqual(['보고서']);
    expect(result.settings.current.pinned).toBe(false);
    await result.settings.update({ opacity: 50 });
    expect(JSON.parse(files.files.get(SETTINGS_FILE) ?? '')).toMatchObject({ pinned: false, opacity: 50 });
  });

  it('STORE-10 STORE-20 다시 읽어도 tasks.json을 읽지 못해야 위젯을 띄우지 않는다', async () => {
    files.files.set(TASKS_FILE, '{"version":2,"tasks":[]}');
    files.unreadable.add(TASKS_FILE);
    expect((await start()).kind).toBe('cannotOpen');
    expect(files.readAttempts.filter((name) => name === TASKS_FILE)).toHaveLength(4);
  });

  it('준비되면 할 일 세션과 설정을 돌려준다', async () => {
    files.files.set(SETTINGS_FILE, '{"pinned": false}');
    const result = await start();
    if (result.kind !== 'ready')
      throw new Error('준비되지 않았어요');
    expect(result.settings.current.pinned).toBe(false);
    expect(result.session.items).toEqual([]);
  });
});
