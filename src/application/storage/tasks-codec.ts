import { Timestamp } from '../../domain/timestamp.ts';
import type { TodoItem } from '../../domain/todo-item.ts';
import { isTodoStatus } from '../../domain/todo-status.ts';
import { stripBom } from './bom.ts';

export const TASKS_FORMAT_VERSION = 2;

export type DecodedTasks =
  | { kind: 'v2'; items: TodoItem[] }
  | { kind: 'v1'; items: TodoItem[] }
  | { kind: 'broken'; reason: string }
  | { kind: 'newer'; version: number };

type ParseTime = (text: string) => Timestamp | null;

const BLANK = /^\p{White_Space}*$/u;

/** `tasks.json` 내용을 읽는다. 깨짐의 기준은 STORE-08, v1.4 형식은 STORE-12, 더 새 버전은 STORE-14. */
export function decodeTasks(text: string): DecodedTasks {
  let data: unknown;
  try {
    data = JSON.parse(stripBom(text));
  } catch {
    return broken('JSON 문법 오류 또는 빈 파일');
  }
  if (Array.isArray(data))
    return decodeItems(data, (t) => Timestamp.parseV1(t), 'v1');
  if (!isRecord(data) || !('version' in data))
    return broken('최상위가 배열도 version이 있는 객체도 아님');

  const version = data['version'];
  if (typeof version !== 'number' || !Number.isInteger(version))
    return broken('version이 정수가 아님');
  if (version > TASKS_FORMAT_VERSION)
    return { kind: 'newer', version };
  if (version !== TASKS_FORMAT_VERSION)
    return broken(`알 수 없는 version ${version}`);
  const tasks = data['tasks'];
  if (!Array.isArray(tasks))
    return broken('tasks가 배열이 아님');
  return decodeItems(tasks, (t) => Timestamp.parse(t), 'v2');
}

/** v2 형식으로 쓴다. 들여쓰기 2칸, 한글은 그대로 (STORE-03, STORE-04). */
export function encodeTasks(items: readonly TodoItem[]): string {
  const tasks = items.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    createdAt: item.createdAt.format(),
    completedAt: item.completedAt ? item.completedAt.format() : null,
  }));
  return `${JSON.stringify({ version: TASKS_FORMAT_VERSION, tasks }, null, 2)}\n`;
}

function decodeItems(raw: unknown[], parseTime: ParseTime, kind: 'v1' | 'v2'): DecodedTasks {
  const items: TodoItem[] = [];
  for (const [index, entry] of raw.entries()) {
    const item = decodeItem(entry, parseTime);
    if (typeof item === 'string')
      return broken(`${index}번째 항목: ${item}`);
    items.push(item);
  }
  return { kind, items };
}

/** 할 일 하나. 문제가 있으면 이유 문자열을 돌려준다. */
function decodeItem(entry: unknown, parseTime: ParseTime): TodoItem | string {
  if (!isRecord(entry))
    return '비어 있거나 객체가 아님';
  const { id, title, status, createdAt, completedAt } = entry;
  if (typeof id !== 'string' || BLANK.test(id))
    return 'id가 없음';
  if (typeof title !== 'string' || BLANK.test(title))
    return 'title이 없음';
  if (!isTodoStatus(status))
    return '알 수 없는 status';
  const created = typeof createdAt === 'string' ? parseTime(createdAt) : null;
  if (!created)
    return 'createdAt 형식 오류';
  let completed: Timestamp | null = null;
  if (completedAt !== null && completedAt !== undefined) {
    completed = typeof completedAt === 'string' ? parseTime(completedAt) : null;
    if (!completed)
      return 'completedAt 형식 오류';
  }
  // 끝낸 일이 아닌 항목의 끝낸 시각은 없는 것으로 읽는다 (STORE-09).
  return { id, title, status, createdAt: created, completedAt: status === 'done' ? completed : null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function broken(reason: string): DecodedTasks {
  return { kind: 'broken', reason };
}
