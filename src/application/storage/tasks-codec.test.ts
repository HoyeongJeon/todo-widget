import { describe, expect, it } from 'vitest';
import type { TodoItem } from '../../domain/todo-item.ts';
import { ts } from '../../testing/fake-clock.ts';
import { decodeTasks, encodeTasks } from './tasks-codec.ts';

const report: TodoItem = { id: 'a', title: '보고서 초안 쓰기', status: 'doing', createdAt: ts('2026-09-30T09:12:40+09:00'), completedAt: null };
const bank: TodoItem = {
  id: 'b',
  title: '은행 방문',
  status: 'done',
  createdAt: ts('2026-09-29T08:00:00+09:00'),
  completedAt: ts('2026-09-30T14:05:00+09:00'),
};

const validTask = { id: 'a', title: '보고서', status: 'todo', createdAt: '2026-10-03T09:00:00+09:00', completedAt: null };
const v2 = (task: unknown): string => JSON.stringify({ version: 2, tasks: [task] });

function itemsOf(text: string): TodoItem[] {
  const decoded = decodeTasks(text);
  if (decoded.kind !== 'v2' && decoded.kind !== 'v1')
    throw new Error(`읽지 못했어요: ${JSON.stringify(decoded)}`);
  return decoded.items;
}

describe('쓰기', () => {
  it('STORE-04 { version: 2, tasks } 모양, 항목은 다섯 필드, 추가된 순서다', () => {
    const json = JSON.parse(encodeTasks([report, bank]));
    expect(json).toEqual({
      version: 2,
      tasks: [
        { id: 'a', title: '보고서 초안 쓰기', status: 'doing', createdAt: '2026-09-30T09:12:40+09:00', completedAt: null },
        { id: 'b', title: '은행 방문', status: 'done', createdAt: '2026-09-29T08:00:00+09:00', completedAt: '2026-09-30T14:05:00+09:00' },
      ],
    });
    expect(Object.keys(json.tasks[0])).toEqual(['id', 'title', 'status', 'createdAt', 'completedAt']);
  });

  it('STORE-03 들여쓴 JSON이고, 한글을 \\uXXXX로 바꾸지 않고, BOM이 없다', () => {
    const text = encodeTasks([report]);
    expect(text).toContain('\n  "version": 2');
    expect(text).toContain('보고서 초안 쓰기');
    expect(text).not.toContain('\\u');
    expect(text.startsWith('\uFEFF')).toBe(false);
  });

  it('STORE-05 시각은 기록한 시간대를 포함해 쓴다', () => {
    const utc: TodoItem = { ...report, createdAt: ts('2026-10-03T13:00:00+00:00') };
    expect(JSON.parse(encodeTasks([utc])).tasks[0].createdAt).toBe('2026-10-03T13:00:00+00:00');
  });

  it('쓴 것을 다시 읽으면 같은 할 일이다', () => {
    const read = itemsOf(encodeTasks([report, bank]));
    expect(read.map((i) => [i.id, i.title, i.status, i.createdAt.format(), i.completedAt?.format() ?? null])).toEqual([
      ['a', '보고서 초안 쓰기', 'doing', '2026-09-30T09:12:40+09:00', null],
      ['b', '은행 방문', 'done', '2026-09-29T08:00:00+09:00', '2026-09-30T14:05:00+09:00'],
    ]);
  });
});

describe('읽기', () => {
  it('STORE-08 깨진 파일을 알아본다', () => {
    const broken: [string, string][] = [
      ['JSON 문법 오류', '{'],
      ['빈 파일', ''],
      ['최상위 null', 'null'],
      ['최상위 숫자', '3'],
      ['version 없는 객체', '{"tasks":[]}'],
      ['version 1', '{"version":1,"tasks":[]}'],
      ['version 소수', '{"version":2.5,"tasks":[]}'],
      ['version 문자열', '{"version":"2","tasks":[]}'],
      ['tasks 없음', '{"version":2}'],
      ['tasks가 객체', '{"version":2,"tasks":{}}'],
      ['null 항목', v2(null)],
      ['id 없음', v2({ ...validTask, id: undefined })],
      ['id 숫자', v2({ ...validTask, id: 5 })],
      ['id 공백뿐', v2({ ...validTask, id: '　 ' })],
      ['title 없음', v2({ ...validTask, title: undefined })],
      ['title 빈 문자열', v2({ ...validTask, title: '' })],
      ['알 수 없는 status', v2({ ...validTask, status: 'paused' })],
      ['createdAt 없음', v2({ ...validTask, createdAt: undefined })],
      ['v2 파일에 v1 시각', v2({ ...validTask, createdAt: '2026-10-03 09:00:00' })],
      ['completedAt 형식 오류', v2({ ...validTask, status: 'done', completedAt: '어제' })],
      ['completedAt 숫자', v2({ ...validTask, status: 'done', completedAt: 1 })],
      ['v1 파일에 v2 시각', JSON.stringify([{ ...validTask }])],
    ];
    for (const [name, text] of broken)
      expect(decodeTasks(text).kind, name).toBe('broken');
  });

  it('STORE-09 끝낸 일이 아닌 항목의 끝낸 시각은 무시하고, 끝낸 시각이 없는 끝낸 일은 받아들인다', () => {
    const [todo] = itemsOf(v2({ ...validTask, status: 'todo', completedAt: '2026-10-03T10:00:00+09:00' }));
    expect(todo?.completedAt).toBeNull();
    const [done] = itemsOf(v2({ ...validTask, status: 'done', completedAt: null }));
    expect(done?.status).toBe('done');
    expect(done?.completedAt).toBeNull();
  });

  it('STORE-09 completedAt 필드가 아예 없는 항목은 끝낸 시각이 없는 것으로 받아들인다', () => {
    const [todo] = itemsOf(v2({ ...validTask, completedAt: undefined }));
    expect(todo?.completedAt).toBeNull();
    const [done] = itemsOf(v2({ ...validTask, status: 'done', completedAt: undefined }));
    expect(done?.status).toBe('done');
    expect(done?.completedAt).toBeNull();
  });

  it('STORE-12 v1.4 배열 형식은 한국 표준시로 읽고, v2로 쓰면 spec의 변환 결과와 같다', () => {
    const v1 = JSON.stringify([
      { id: 'a', title: '보고서 초안 쓰기', status: 'doing', createdAt: '2026-09-30 09:12:40', completedAt: null },
      { id: 'b', title: '은행 방문', status: 'done', createdAt: '2026-09-29 08:00:00', completedAt: '2026-09-30 14:05:00' },
    ]);
    const decoded = decodeTasks(v1);
    expect(decoded.kind).toBe('v1');
    expect(JSON.parse(encodeTasks(itemsOf(v1)))).toEqual(JSON.parse(encodeTasks([report, bank])));
  });

  it('STORE-14 version이 2보다 큰 정수면 더 새 버전 파일이다', () => {
    expect(decodeTasks('{"version":3,"tasks":"무엇이든"}')).toEqual({ kind: 'newer', version: 3 });
  });

  it('STORE-19 맨 앞 BOM 하나는 무시하고, 두 개면 깨진 파일이다', () => {
    expect(decodeTasks(`\uFEFF${v2(validTask)}`).kind).toBe('v2');
    expect(decodeTasks(`\uFEFF\uFEFF${v2(validTask)}`).kind).toBe('broken');
  });

  it('모르는 필드는 읽을 때 무시하고 쓸 때 뺀다', () => {
    const text = JSON.stringify({ version: 2, extra: true, tasks: [{ ...validTask, color: 'red' }] });
    const encoded = JSON.parse(encodeTasks(itemsOf(text)));
    expect(encoded.extra).toBeUndefined();
    expect(encoded.tasks[0].color).toBeUndefined();
  });
});
