import type { Clock } from './clock.ts';
import type { IdGenerator } from './ids.ts';
import { splitLines, stripBullet } from './paste.ts';
import { Title } from './title.ts';
import type { TodoItem } from './todo-item.ts';
import { type TodoStatus, nextStatus } from './todo-status.ts';

/**
 * 할 일 목록의 규칙. 바꾸는 method는 "변경 없음"이면 false를 돌려준다(tasks.md "변경 없음").
 * 내부 배열은 바뀔 때마다 새로 만들어 바깥에 준 배열이 바뀌지 않게 한다.
 */
export class TodoList {
  #items: readonly TodoItem[];
  readonly #clock: Clock;
  readonly #newId: IdGenerator;

  constructor(clock: Clock, newId: IdGenerator, items: readonly TodoItem[] = []) {
    this.#clock = clock;
    this.#newId = newId;
    this.#items = [...items];
  }

  /** 목록에 추가된 순서. 저장하는 순서이기도 하다 (STORE-04, LIST-03). */
  get items(): readonly TodoItem[] {
    return this.#items;
  }

  /** 할 일과 하는 중의 합 (TASK-16). */
  get remainingCount(): number {
    return this.#items.filter((item) => item.status !== 'done').length;
  }

  add(rawTitle: string): boolean {
    const title = Title.parse(rawTitle);
    if (!title)
      return false;
    const item: TodoItem = { id: this.#newId(), title: title.text, status: 'todo', createdAt: this.#clock.now(), completedAt: null };
    this.#items = [...this.#items, item];
    return true;
  }

  /** 입력칸의 한 줄이나 붙여 넣은 여러 줄을 줄마다 추가한다. 추가한 개수를 돌려준다 (INPUT-08, INPUT-09, INPUT-20). */
  addLines(text: string): number {
    let added = 0;
    for (const line of splitLines(text)) {
      if (this.add(stripBullet(line)))
        added++;
    }
    return added;
  }

  cycle(id: string): boolean {
    const item = this.#find(id);
    return item ? this.#apply(item, nextStatus(item.status)) : false;
  }

  setStatus(id: string, status: TodoStatus): boolean {
    const item = this.#find(id);
    return item ? this.#apply(item, status) : false;
  }

  rename(id: string, rawTitle: string): boolean {
    const item = this.#find(id);
    const title = Title.parse(rawTitle);
    if (!item || !title || title.text === item.title)
      return false;
    this.#replace(item, { ...item, title: title.text });
    return true;
  }

  remove(id: string): boolean {
    const item = this.#find(id);
    if (!item)
      return false;
    this.#items = this.#items.filter((other) => other !== item);
    return true;
  }

  clear(): boolean {
    if (this.#items.length === 0)
      return false;
    this.#items = [];
    return true;
  }

  /** 할 일 섹션: 하는 중이 위, 할 일이 아래. 각각 만든 시각이 오래된 것이 위 (LIST-02, LIST-03). */
  todoSection(): TodoItem[] {
    const byCreated = (status: TodoStatus): TodoItem[] =>
      this.#items.filter((item) => item.status === status).sort((a, b) => a.createdAt.compare(b.createdAt));
    return [...byCreated('doing'), ...byCreated('todo')];
  }

  /** 끝낸 일 섹션: 최근에 끝낸 것이 위, 끝낸 시각이 없는 것은 맨 아래 (LIST-04, LIST-05). */
  doneSection(): TodoItem[] {
    return this.#items
      .filter((item) => item.status === 'done')
      .sort((a, b) => {
        if (!a.completedAt || !b.completedAt)
          return (a.completedAt ? 0 : 1) - (b.completedAt ? 0 : 1);
        return b.completedAt.compare(a.completedAt);
      });
  }

  /** 같은 상태면 변경 없음. 끝낸 일이 되면 지금 시각을, 벗어나면 끝낸 시각을 지운다 (TASK-06~10). */
  #apply(item: TodoItem, status: TodoStatus): boolean {
    if (item.status === status)
      return false;
    this.#replace(item, { ...item, status, completedAt: status === 'done' ? this.#clock.now() : null });
    return true;
  }

  #replace(previous: TodoItem, next: TodoItem): void {
    this.#items = this.#items.map((item) => (item === previous ? next : item));
  }

  #find(id: string): TodoItem | undefined {
    return this.#items.find((item) => item.id === id);
  }
}
