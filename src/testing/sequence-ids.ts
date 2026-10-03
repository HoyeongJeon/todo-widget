import type { IdGenerator } from '../domain/ids.ts';

/** 테스트용: `id-1`, `id-2`, ... 순서대로 만든다. */
export function sequenceIds(prefix = 'id'): IdGenerator {
  let n = 0;
  return () => `${prefix}-${++n}`;
}
