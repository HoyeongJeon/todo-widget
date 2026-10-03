import { describe, expect, it } from 'vitest';
import { FakeClock, ts } from '../testing/fake-clock.ts';
import { sequenceIds } from '../testing/sequence-ids.ts';
import type { TodoItem } from './todo-item.ts';
import { TodoList } from './todo-list.ts';
import type { TodoStatus } from './todo-status.ts';

function item(id: string, status: TodoStatus, createdAt: string, completedAt: string | null = null): TodoItem {
  return { id, title: id, status, createdAt: ts(createdAt), completedAt: completedAt ? ts(completedAt) : null };
}

function listOf(...items: TodoItem[]): TodoList {
  return new TodoList(new FakeClock(), sequenceIds(), items);
}

describe('할 일 섹션', () => {
  it('LIST-02 하는 중이 위, 할 일이 아래이고 각각 만든 시각이 오래된 것이 위다', () => {
    const list = listOf(
      item('a', 'todo', '2026-10-03T09:00:00+09:00'),
      item('b', 'doing', '2026-10-03T10:00:00+09:00'),
      item('c', 'todo', '2026-10-03T08:00:00+09:00'),
      item('d', 'doing', '2026-10-03T07:00:00+09:00'),
      item('e', 'done', '2026-10-03T06:00:00+09:00', '2026-10-03T06:30:00+09:00'),
    );
    expect(list.todoSection().map((i) => i.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('LIST-02 만든 시각도 시간대와 관계없이 실제 시각으로 비교한다', () => {
    const list = listOf(item('later', 'todo', '2026-10-03T00:30:00+00:00'), item('earlier', 'todo', '2026-10-03T08:00:00+09:00'));
    expect(list.todoSection().map((i) => i.id)).toEqual(['earlier', 'later']);
  });

  it('LIST-03 같은 초에 만든 할 일은 추가한 순서를 지킨다', () => {
    const list = listOf(
      item('x', 'todo', '2026-10-03T09:00:00+09:00'),
      item('y', 'todo', '2026-10-03T09:00:00+09:00'),
      item('z', 'todo', '2026-10-03T09:00:00+09:00'),
    );
    expect(list.todoSection().map((i) => i.id)).toEqual(['x', 'y', 'z']);

    const added = new TodoList(new FakeClock(), sequenceIds());
    added.addLines('첫째\n둘째\n셋째');
    expect(added.todoSection().map((i) => i.title)).toEqual(['첫째', '둘째', '셋째']);
  });
});

describe('끝낸 일 섹션', () => {
  it('LIST-04 최근에 끝낸 것이 위이고, 시간대가 달라도 실제 시각으로 비교한다', () => {
    const list = listOf(
      item('earlier', 'done', '2026-10-02T09:00:00+09:00', '2026-10-03T08:00:00+09:00'),
      item('later', 'done', '2026-10-02T09:00:00+09:00', '2026-10-03T00:30:00+00:00'),
      item('todo', 'todo', '2026-10-02T09:00:00+09:00'),
    );
    expect(list.doneSection().map((i) => i.id)).toEqual(['later', 'earlier']);
  });

  it('LIST-05 끝낸 시각이 없는 끝낸 일은 맨 아래다', () => {
    const list = listOf(
      item('none', 'done', '2026-10-02T09:00:00+09:00'),
      item('old', 'done', '2026-10-02T09:00:00+09:00', '2026-10-02T10:00:00+09:00'),
      item('new', 'done', '2026-10-02T09:00:00+09:00', '2026-10-03T10:00:00+09:00'),
    );
    expect(list.doneSection().map((i) => i.id)).toEqual(['new', 'old', 'none']);
  });
});
