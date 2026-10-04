/** Tauri `invoke`의 모양. adapter는 이 타입만 알고, 실제 함수는 composition root가 넘긴다. */
export type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;
