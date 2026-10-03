import type { IdGenerator } from '../../domain/ids.ts';

/** 겹치지 않는 GUID 문자열 (TASK-02). WebView와 Node 모두 Web Crypto를 가진다. */
export function createIdGenerator(): IdGenerator {
  return () => globalThis.crypto.randomUUID();
}
