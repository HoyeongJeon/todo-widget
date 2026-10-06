import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TASKS_FILE, TaskRepository } from '../../application/storage/task-repository.ts';
import { TodoSession } from '../../application/todo-session.ts';
import { FakeClock } from '../../testing/fake-clock.ts';
import { MemoryFileStore } from '../../testing/memory-file-store.ts';
import { sequenceIds } from '../../testing/sequence-ids.ts';
import { MESSAGE_KEYS, type PluralText } from './keys.ts';
import { DICTIONARIES, createTranslator } from './translator.ts';

interface SpecRow {
  key: string;
  ko: string;
  en: string;
}

/** spec/behavior/i18n.md "문구" 표의 줄. */
function specRows(): SpecRow[] {
  const text = readFileSync(new URL('../../../spec/behavior/i18n.md', import.meta.url), 'utf8');
  const table = text.slice(text.indexOf('## 문구'));
  return [...table.matchAll(/^\| `([A-Za-z.]+)` \| (.+) \| (.+) \|$/gm)].map((m) => ({ key: m[1] ?? '', ko: m[2] ?? '', en: m[3] ?? '' }));
}

/** 사전 값을 spec 표와 같은 모양으로 적는다. 복수 형태는 `one: … / other: …`. */
function asSpecCell(entry: string | PluralText): string {
  return typeof entry === 'string' ? entry : `one: ${entry.one} / other: ${entry.other}`;
}

describe('사전', () => {
  it('I18N-03 네 언어 사전의 키가 spec 문구 표의 키와 똑같다', () => {
    const expected = specRows().map((row) => row.key).sort();
    expect(expected).toHaveLength(34);
    expect([...MESSAGE_KEYS].sort()).toEqual(expected);
    for (const dictionary of Object.values(DICTIONARIES))
      expect(Object.keys(dictionary).sort()).toEqual(expected);
  });

  it('I18N-03 한국어·영어 문구는 spec 문구 표와 같다', () => {
    for (const row of specRows()) {
      const key = row.key as (typeof MESSAGE_KEYS)[number];
      expect(asSpecCell(DICTIONARIES.ko[key]), row.key).toBe(row.ko);
      expect(asSpecCell(DICTIONARIES.en[key]), row.key).toBe(row.en);
    }
  });

  it('I18N-04 개수가 들어간 문구는 언어별 복수 규칙을 따른다', () => {
    const en = createTranslator('en');
    const ko = createTranslator('ko');
    const de = createTranslator('de');
    const zh = createTranslator('zh-Hans');
    expect([en('header.remaining', 1), en('header.remaining', 3), en('reset.question', 1), en('reset.question', 5)]).toEqual([
      '1 task left',
      '3 tasks left',
      'Delete 1 task?',
      'Delete all 5 tasks?',
    ]);
    expect([ko('header.remaining', 1), ko('header.remaining', 3), ko('reset.question', 1), ko('reset.question', 5)]).toEqual([
      '1개 남음',
      '3개 남음',
      '할 일 1개를 모두 지울까요?',
      '할 일 5개를 모두 지울까요?',
    ]);
    expect([de('header.remaining', 1), de('header.remaining', 2), de('reset.question', 1), de('reset.question', 5)]).toEqual([
      '1 Aufgabe offen',
      '2 Aufgaben offen',
      '1 Aufgabe löschen?',
      'Alle 5 Aufgaben löschen?',
    ]);
    expect([zh('header.remaining', 1), zh('reset.question', 5)]).toEqual(['还剩 1 项', '要删除全部 5 项待办吗？']);
  });

  it('I18N-04 영어·독일어만 one/other 두 형태가 있고, 한국어·중국어는 한 형태만 쓴다', () => {
    const pluralKeys = (language: keyof typeof DICTIONARIES) =>
      MESSAGE_KEYS.filter((key) => typeof DICTIONARIES[language][key] !== 'string');
    expect(pluralKeys('en')).toEqual(['header.remaining', 'reset.question']);
    expect(pluralKeys('de')).toEqual(['header.remaining', 'reset.question']);
    expect(pluralKeys('ko')).toEqual([]);
    expect(pluralKeys('zh-Hans')).toEqual([]);
  });

  it('I18N-04 {n} 자리가 있는 문구는 네 언어 모두 그 자리가 있다', () => {
    for (const key of MESSAGE_KEYS) {
      const hasCount = asSpecCell(DICTIONARIES.ko[key]).includes('{n}');
      for (const dictionary of Object.values(DICTIONARIES)) {
        const entry = dictionary[key];
        const forms = typeof entry === 'string' ? [entry] : [entry.one, entry.other];
        for (const form of forms)
          expect(form.includes('{n}'), `${key}: ${form}`).toBe(hasCount);
      }
    }
  });

  it('I18N-04 개수 없이 꺼내면 other 형태를 그대로 준다', () => {
    expect(createTranslator('en')('menu.quit')).toBe('Quit');
    expect(createTranslator('en')('header.remaining')).toBe('{n} tasks left');
  });

  it('I18N-05 저장 데이터는 언어와 무관하고 화면에서만 번역된다', async () => {
    const files = new MemoryFileStore();
    const clock = new FakeClock();
    const session = await TodoSession.open(new TaskRepository(files, clock), clock, sequenceIds());
    session.add('보고서 쓰기');
    session.setStatus(session.items[0]?.id ?? '', 'doing');
    await session.whenSaved();
    const saved = files.files.get(TASKS_FILE) ?? '';
    expect(JSON.parse(saved).tasks[0]).toMatchObject({ title: '보고서 쓰기', status: 'doing' });

    // 영어 화면으로 다시 켜도 파일은 그대로이고, 상태 이름만 화면에서 번역된다.
    const writes = files.writes.length;
    const reopened = await TodoSession.open(new TaskRepository(files, clock), clock, sequenceIds());
    expect(reopened.items[0]).toMatchObject({ title: '보고서 쓰기', status: 'doing' });
    expect(files.writes).toHaveLength(writes);
    expect(createTranslator('ko')('status.doing')).toBe('하는 중');
    expect(createTranslator('en')('status.doing')).toBe('In progress');
  });
});
