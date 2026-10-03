/** 나중에 한 번 실행한다. 돌려준 함수를 부르면 취소된다. */
export interface Timer {
  schedule(ms: number, task: () => void): () => void;
}
