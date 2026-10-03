import { describe, expect, it } from 'vitest';
import { ts } from '../../testing/fake-clock.ts';
import { DEFAULT_SETTINGS, decodeSettings, encodeSettings } from './settings-codec.ts';

describe('settings.json 읽기', () => {
  it('STORE-15 파일이 없거나, 문법 오류·빈 파일·null·객체가 아니면 모두 기본값이다', () => {
    for (const text of [null, '{', '', 'null', '[]', '3', '"설정"'])
      expect(decodeSettings(text), String(text)).toEqual({ settings: DEFAULT_SETTINGS, unknown: {} });
  });

  it('STORE-15 기본값은 위치·크기·투명도 없음, 고정 켜짐, 끝낸 일 접힘, 할 일 펼침, 확인 시각 없음이다', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      left: null,
      top: null,
      width: null,
      maxHeight: null,
      opacity: null,
      pinned: true,
      doneExpanded: false,
      todoExpanded: true,
      lastUpdateCheck: null,
    });
  });

  it('STORE-15 항목마다 따로 판단해 틀린 항목만 기본값을 쓴다', () => {
    const { settings } = decodeSettings('{"left": 10, "pinned": "yes", "doneExpanded": null, "width": "넓게", "opacity": 0.8}');
    expect(settings).toMatchObject({ left: 10, pinned: true, doneExpanded: false, width: null, opacity: 0.8 });
  });

  it('STORE-15 todoExpanded가 없는 예전 파일은 할 일 섹션이 펼쳐진다', () => {
    expect(decodeSettings('{"pinned": false}').settings).toMatchObject({ pinned: false, todoExpanded: true });
  });

  it('STORE-15 lastUpdateCheck는 STORE-05 형식일 때만 읽는다', () => {
    expect(decodeSettings('{"lastUpdateCheck": "2026-10-03T09:00:00+09:00"}').settings.lastUpdateCheck?.format()).toBe('2026-10-03T09:00:00+09:00');
    expect(decodeSettings('{"lastUpdateCheck": "2026-10-03 09:00:00"}').settings.lastUpdateCheck).toBeNull();
  });

  it('STORE-15 모르는 항목은 따로 모아 둔다', () => {
    expect(decodeSettings('{"left": 1, "doingExpanded": true, "future": {"a": 1}}').unknown).toEqual({ doingExpanded: true, future: { a: 1 } });
  });

  it('STORE-19 맨 앞 BOM 하나는 무시한다', () => {
    expect(decodeSettings('\uFEFF{"pinned": false}').settings.pinned).toBe(false);
  });
});

describe('settings.json 쓰기', () => {
  it('STORE-03 들여쓴 JSON이고 BOM이 없다', () => {
    const text = encodeSettings(DEFAULT_SETTINGS, {});
    expect(text).toContain('\n  "pinned": true');
    expect(text.startsWith('\uFEFF')).toBe(false);
  });

  it('STORE-15 모르는 항목을 이름과 값 그대로 남긴다', () => {
    const json = JSON.parse(encodeSettings(DEFAULT_SETTINGS, { doingExpanded: true, future: { a: 1 } }));
    expect(json.doingExpanded).toBe(true);
    expect(json.future).toEqual({ a: 1 });
    expect(json.pinned).toBe(true);
  });

  it('STORE-16 NaN·무한대인 숫자는 null로 쓰고 나머지는 그대로 쓴다', () => {
    const json = JSON.parse(encodeSettings({ ...DEFAULT_SETTINGS, left: NaN, top: Infinity, width: 400, maxHeight: -Infinity, opacity: 0.9 }, {}));
    expect(json).toMatchObject({ left: null, top: null, width: 400, maxHeight: null, opacity: 0.9 });
  });

  it('lastUpdateCheck는 STORE-05 형식으로 쓴다', () => {
    const json = JSON.parse(encodeSettings({ ...DEFAULT_SETTINGS, lastUpdateCheck: ts('2026-10-03T09:00:00+09:00') }, {}));
    expect(json.lastUpdateCheck).toBe('2026-10-03T09:00:00+09:00');
  });
});
