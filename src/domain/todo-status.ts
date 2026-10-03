export type TodoStatus = 'todo' | 'doing' | 'done';

/** 상태 순환: 할 일 → 하는 중 → 끝낸 일 → 할 일 (TASK-05). */
export function nextStatus(status: TodoStatus): TodoStatus {
  if (status === 'todo')
    return 'doing';
  return status === 'doing' ? 'done' : 'todo';
}

export function isTodoStatus(value: unknown): value is TodoStatus {
  return value === 'todo' || value === 'doing' || value === 'done';
}
