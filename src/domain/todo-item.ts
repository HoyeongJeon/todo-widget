import type { Timestamp } from './timestamp.ts';
import type { TodoStatus } from './todo-status.ts';

/** 할 일 하나. 바뀔 때마다 새 객체로 바꾼다(불변). 끝낸 시각은 끝낸 일에만 있다. */
export interface TodoItem {
  readonly id: string;
  readonly title: string;
  readonly status: TodoStatus;
  readonly createdAt: Timestamp;
  readonly completedAt: Timestamp | null;
}
