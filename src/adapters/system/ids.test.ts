import { describe, expect, it } from 'vitest';
import { createIdGenerator } from './ids.ts';

describe('시스템 id 생성기', () => {
  it('TASK-02 GUID 문자열이고 겹치지 않는다', () => {
    const next = createIdGenerator();
    const ids = Array.from({ length: 200 }, () => next());
    expect(new Set(ids).size).toBe(200);
    for (const id of ids)
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
