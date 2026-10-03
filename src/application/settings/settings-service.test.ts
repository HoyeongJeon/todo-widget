import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryFileStore } from '../../testing/memory-file-store.ts';
import { SETTINGS_FILE, SettingsRepository } from './settings-repository.ts';
import { SettingsService } from './settings-service.ts';

let files: MemoryFileStore;

beforeEach(() => {
  files = new MemoryFileStore();
});

async function open(): Promise<SettingsService> {
  return SettingsService.open(new SettingsRepository(files));
}

function saved(): Record<string, unknown> {
  return JSON.parse(files.files.get(SETTINGS_FILE) ?? 'null');
}

describe('설정 서비스', () => {
  it('LIST-09 접힘 상태를 바꾸면 바로 저장하고 다음에 켤 때 그대로 쓴다', async () => {
    const service = await open();
    await service.update({ doneExpanded: true, todoExpanded: false });
    expect(saved()).toMatchObject({ doneExpanded: true, todoExpanded: false });
    expect((await open()).current).toMatchObject({ doneExpanded: true, todoExpanded: false });
  });

  it('WND-09 맨 위 고정은 기본이 켜짐이고, 바꾸면 저장해 다음에 켤 때 적용한다', async () => {
    const service = await open();
    expect(service.current.pinned).toBe(true);
    await service.update({ pinned: false });
    expect(saved()).toMatchObject({ pinned: false });
    expect((await open()).current.pinned).toBe(false);
  });

  it('WND-14 닫을 때 위치와 접힘 상태를 다른 설정과 함께 한 번에 저장한다', async () => {
    const service = await open();
    service.stage({ opacity: 0.8 });
    await service.update({ left: 100, top: 200, doneExpanded: true, todoExpanded: true });
    expect(saved()).toMatchObject({ left: 100, top: 200, doneExpanded: true, todoExpanded: true, opacity: 0.8 });
    expect(files.writes).toHaveLength(1);
  });

  it('stage는 저장하지 않고, save가 그때의 설정을 저장한다', async () => {
    const service = await open();
    service.stage({ opacity: 0.7 });
    expect(files.writes).toHaveLength(0);
    expect(await service.save()).toBe(true);
    expect(saved()).toMatchObject({ opacity: 0.7 });
  });

  it('STORE-17 설정을 쓰지 못해도 알리지 않고, 바꾼 값은 그대로 적용된 채다', async () => {
    const service = await open();
    files.failWrites = true;
    await expect(service.update({ pinned: false })).resolves.toBeUndefined();
    expect(service.current.pinned).toBe(false);
    expect(await service.save()).toBe(false);
    files.failWrites = false;
    await service.update({ left: 5 });
    expect(saved()).toMatchObject({ pinned: false, left: 5 });
  });

  it('STORE-15 모르는 항목은 다음 설정 저장 때 남기고, 객체가 아닌 깨진 파일은 표의 항목만 써서 덮어쓴다', async () => {
    files.files.set(SETTINGS_FILE, '{"left": 1, "doingExpanded": true}');
    await (await open()).update({ pinned: false });
    expect(saved()).toMatchObject({ left: 1, doingExpanded: true, pinned: false });

    files.files.set(SETTINGS_FILE, '[1, 2]');
    await (await open()).update({ pinned: false });
    expect(Object.keys(saved()).sort()).toEqual(
      ['doneExpanded', 'lastUpdateCheck', 'left', 'maxHeight', 'opacity', 'pinned', 'todoExpanded', 'top', 'width'],
    );
  });

  it('STORE-15 읽지 못하는 settings.json은 기본값을 쓴다', async () => {
    files.files.set(SETTINGS_FILE, '{"pinned": false}');
    files.unreadable.add(SETTINGS_FILE);
    expect((await open()).current.pinned).toBe(true);
  });

  it('exists는 settings.json이 있는지 알려 준다 (처음 실행 판단)', async () => {
    const repo = new SettingsRepository(files);
    expect(await repo.exists()).toBe(false);
    files.files.set(SETTINGS_FILE, '{}');
    expect(await repo.exists()).toBe(true);
  });
});
