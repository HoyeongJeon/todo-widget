import { beforeEach, describe, expect, it } from 'vitest';
import { FakeClock } from '../testing/fake-clock.ts';
import { sequenceIds } from '../testing/sequence-ids.ts';
import { TodoList } from './todo-list.ts';

let clock: FakeClock;
let list: TodoList;

beforeEach(() => {
  clock = new FakeClock('2026-10-03T09:00:00+09:00');
  list = new TodoList(clock, sequenceIds());
});

function only() {
  const [item] = list.items;
  if (!item)
    throw new Error('할 일이 없어요');
  return item;
}

describe('추가', () => {
  it('TASK-01 새 할 일은 할 일 상태로 만들어진다', () => {
    expect(list.add('보고서 초안 쓰기')).toBe(true);
    const item = only();
    expect(item.title).toBe('보고서 초안 쓰기');
    expect(item.status).toBe('todo');
    expect(item.createdAt.format()).toBe('2026-10-03T09:00:00+09:00');
    expect(item.completedAt).toBeNull();
  });

  it('TASK-02 추가할 때마다 id 생성기에서 서로 다른 id를 받는다', () => {
    list.add('a');
    list.add('b');
    list.add('c');
    expect(list.items.map((i) => i.id)).toEqual(['id-1', 'id-2', 'id-3']);
  });

  it('TASK-03 제목의 공백을 정리한다', () => {
    list.add('  보고서\n  쓰기\t ');
    expect(only().title).toBe('보고서 쓰기');
  });

  it('TASK-04 정리하고 나서 빈 제목이면 추가하지 않는다', () => {
    for (const raw of ['', '   ', '\n\t'])
      expect(list.add(raw)).toBe(false);
    expect(list.items).toEqual([]);
  });
});

describe('상태', () => {
  it('TASK-05 할 일 → 하는 중 → 끝낸 일 → 할 일로 돈다', () => {
    list.add('a');
    const id = only().id;
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      expect(list.cycle(id)).toBe(true);
      seen.push(only().status);
    }
    expect(seen).toEqual(['doing', 'done', 'todo']);
  });

  it('TASK-06 끝낸 일이 되면 지금 시각을 끝낸 시각으로 기록한다 (순환과 지정 모두)', () => {
    list.add('a');
    list.add('b');
    const [a, b] = list.items.map((i) => i.id);
    list.setStatus(a!, 'doing');
    list.setStatus(b!, 'doing');
    clock.set('2026-10-03T09:30:00+09:00');
    list.cycle(a!);
    list.setStatus(b!, 'done');
    expect(list.items.map((i) => i.completedAt?.format())).toEqual(['2026-10-03T09:30:00+09:00', '2026-10-03T09:30:00+09:00']);
  });

  it('TASK-07 끝낸 일에서 벗어나면 끝낸 시각을 지운다', () => {
    list.add('a');
    const id = only().id;
    list.setStatus(id, 'done');
    list.setStatus(id, 'doing');
    expect(only().completedAt).toBeNull();
    list.setStatus(id, 'done');
    list.cycle(id);
    expect(only().status).toBe('todo');
    expect(only().completedAt).toBeNull();
  });

  it('TASK-08 다시 끝내면 그때의 새 시각을 기록한다', () => {
    list.add('a');
    const id = only().id;
    list.setStatus(id, 'done');
    list.setStatus(id, 'todo');
    clock.advance(60 * 60 * 1000);
    list.setStatus(id, 'done');
    expect(only().completedAt?.format()).toBe('2026-10-03T10:00:00+09:00');
  });

  it('TASK-09 이미 끝낸 일을 다시 끝낸 일로 지정하면 아무것도 바뀌지 않는다', () => {
    list.add('a');
    const id = only().id;
    list.setStatus(id, 'done');
    clock.advance(60 * 60 * 1000);
    const before = list.items;
    expect(list.setStatus(id, 'done')).toBe(false);
    expect(list.items).toBe(before);
    expect(only().completedAt?.format()).toBe('2026-10-03T09:00:00+09:00');
  });

  it('TASK-10 상태를 한 번에 지정하고, 같은 상태로 지정하면 변경 없음이다', () => {
    list.add('a');
    const id = only().id;
    expect(list.setStatus(id, 'done')).toBe(true);
    expect(only().status).toBe('done');
    expect(list.setStatus(id, 'doing')).toBe(true);
    expect(only().status).toBe('doing');
    const before = list.items;
    expect(list.setStatus(id, 'doing')).toBe(false);
    expect(list.items).toBe(before);
  });
});

describe('이름 바꾸기, 삭제, 모두 지우기', () => {
  it('TASK-11 이름도 같은 규칙으로 정리하고, 정리한 제목이 같으면 변경 없음이다', () => {
    list.add('초안');
    const id = only().id;
    expect(list.rename(id, '  보고서\n초안  ')).toBe(true);
    expect(only().title).toBe('보고서 초안');
    const before = list.items;
    expect(list.rename(id, '  보고서 초안 ')).toBe(false);
    expect(list.items).toBe(before);
  });

  it('TASK-12 빈 제목으로는 이름을 바꿀 수 없다', () => {
    list.add('초안');
    const before = list.items;
    expect(list.rename(only().id, '   ')).toBe(false);
    expect(list.items).toBe(before);
    expect(only().title).toBe('초안');
  });

  it('TASK-13 삭제하면 그 할 일만 사라진다', () => {
    list.add('a');
    list.add('b');
    const [a] = list.items.map((i) => i.id);
    expect(list.remove(a!)).toBe(true);
    expect(list.items.map((i) => i.title)).toEqual(['b']);
  });

  it('TASK-14 모두 지우면 상태와 관계없이 전부 사라지고, 비어 있으면 변경 없음이다', () => {
    list.add('a');
    list.add('b');
    list.add('c');
    const [a, b] = list.items.map((i) => i.id);
    list.setStatus(a!, 'doing');
    list.setStatus(b!, 'done');
    expect(list.clear()).toBe(true);
    expect(list.items).toEqual([]);
    const before = list.items;
    expect(list.clear()).toBe(false);
    expect(list.items).toBe(before);
  });

  it('TASK-15 없는 id로 조작하면 아무것도 바뀌지 않는다', () => {
    list.add('a');
    const before = list.items;
    expect(list.cycle('없음')).toBe(false);
    expect(list.setStatus('없음', 'done')).toBe(false);
    expect(list.rename('없음', '새 이름')).toBe(false);
    expect(list.remove('없음')).toBe(false);
    expect(list.items).toBe(before);
  });

  it('TASK-16 남은 개수는 할 일과 하는 중의 합이다', () => {
    for (const t of ['a', 'b', 'c', 'd'])
      list.add(t);
    const [a, b] = list.items.map((i) => i.id);
    list.setStatus(a!, 'doing');
    list.setStatus(b!, 'done');
    expect(list.remainingCount).toBe(3);
  });
});

describe('여러 줄 추가', () => {
  it('INPUT-08 빈 줄과 공백 줄은 건너뛰고 나머지를 붙여 넣은 순서로 추가한다', () => {
    expect(list.addLines('은행\n\n   \n택배')).toBe(2);
    expect(list.items.map((i) => i.title)).toEqual(['은행', '택배']);
  });

  it('INPUT-09 줄 앞의 - 또는 • 하나를 떼고, 숫자 기호는 남기고, 기호만 있는 줄은 건너뛴다', () => {
    expect(list.addLines('  - 은행 방문\r\n• 택배 반품\n1. 분기 보고서\n-\n--두 개')).toBe(4);
    expect(list.items.map((i) => i.title)).toEqual(['은행 방문', '택배 반품', '1. 분기 보고서', '-두 개']);
  });

  it('한 줄도 같은 규칙으로 추가한다', () => {
    expect(list.addLines('- 은행 방문')).toBe(1);
    expect(list.addLines('-')).toBe(0);
    expect(list.items.map((i) => i.title)).toEqual(['은행 방문']);
  });
});
