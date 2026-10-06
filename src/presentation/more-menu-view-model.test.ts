import { describe, expect, it } from 'vitest';
import { SETTINGS_FILE } from '../application/settings/settings-repository.ts';
import { flush } from '../testing/fake-timer.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { createTestApp } from '../testing/test-app.ts';
import { MoreMenuViewModel } from './more-menu-view-model.svelte.ts';

async function setup(settings?: Record<string, unknown>) {
  const files = new MemoryFileStore();
  if (settings)
    files.files.set(SETTINGS_FILE, JSON.stringify(settings));
  const test = await createTestApp(files);
  let hasItems = false;
  let resets = 0;
  const menu = new MoreMenuViewModel({
    app: test.app,
    report: () => undefined,
    hasItems: () => hasItems,
    onReset: () => resets++,
  });
  return { ...test, menu, setHasItems: (value: boolean) => (hasItems = value), resets: () => resets };
}

const settingsWrites = (files: MemoryFileStore) => files.writes.filter((name) => name === SETTINGS_FILE).length;

describe('⋯ 메뉴', () => {
  it('START-04 메뉴를 열 때마다 OS 자동 실행 상태를 읽어 체크에 보인다', async () => {
    const { menu, autoStart } = await setup();
    autoStart.enabled = true;
    await menu.show();
    expect([menu.open, menu.autoStartChecked]).toEqual([true, true]);
    menu.close();
    autoStart.enabled = false;
    await menu.show();
    expect(menu.autoStartChecked).toBe(false);
  });

  it('START-04 자동 실행을 누르면 메뉴를 닫고, 바꾼 뒤 다시 읽은 상태를 체크에 보인다', async () => {
    const { menu, autoStart } = await setup();
    await menu.show();
    await menu.toggleAutoStart();
    expect([menu.open, menu.autoStartChecked, autoStart.enabled]).toEqual([false, true, true]);
  });

  it('WND-11 저장된 불투명도를 투명도 %로 보인다', async () => {
    const { menu } = await setup({ opacity: 0.85 });
    expect([menu.transparency, menu.cardOpacity]).toEqual([15, 0.85]);
  });

  it('WND-12 끄는 동안 카드에 바로 보이고, 메뉴를 닫을 때 바뀌었으면 한 번 저장한다', async () => {
    const { menu, files, app } = await setup();
    await flush();
    const before = settingsWrites(files);
    await menu.show();
    menu.setTransparency(14.6);
    menu.setTransparency(30.4);
    expect([menu.transparency, menu.cardOpacity]).toEqual([30, 0.7]);
    expect(settingsWrites(files)).toBe(before);
    menu.close();
    await flush();
    expect(settingsWrites(files)).toBe(before + 1);
    expect(app.settings.current.opacity).toBe(0.7);
    expect([menu.transparency, menu.cardOpacity]).toEqual([30, 0.7]);
  });

  it('WND-12 값이 바뀌지 않았으면 저장하지 않는다', async () => {
    const { menu, files } = await setup({ opacity: 0.7 });
    const before = settingsWrites(files);
    await menu.show();
    menu.setTransparency(10);
    menu.setTransparency(30);
    menu.close();
    await flush();
    expect(settingsWrites(files)).toBe(before);
  });

  it('WND-11 WND-12 휠 한 칸은 2%이고, 범위 밖 값은 0~40%로 맞춘다', async () => {
    const { menu } = await setup();
    await menu.show();
    menu.wheel(true);
    menu.wheel(true);
    expect(menu.transparency).toBe(4);
    menu.wheel(false);
    expect(menu.transparency).toBe(2);
    menu.setTransparency(70);
    expect(menu.transparency).toBe(40);
    menu.setTransparency(-5);
    expect(menu.transparency).toBe(0);
  });

  it('INPUT-19 할 일이 없으면 초기화를 고를 수 없다', async () => {
    const { menu, setHasItems, resets } = await setup();
    expect(menu.resetEnabled).toBe(false);
    setHasItems(true);
    expect(menu.resetEnabled).toBe(true);
    await menu.show();
    menu.reset();
    expect([menu.open, resets()]).toEqual([false, 1]);
  });

  it('START-08 종료를 누르면 메뉴를 닫고 종료 흐름을 탄다', async () => {
    const { menu, process } = await setup();
    await menu.show();
    menu.quit();
    await flush();
    expect([menu.open, process.exits]).toEqual([false, 1]);
  });
});
