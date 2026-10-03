/** 겹치지 않는 할 일 id를 만든다. 실제는 GUID(`src/adapters/system/ids.ts`), 테스트는 순서 번호. */
export type IdGenerator = () => string;
