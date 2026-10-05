/** 앱 프로세스. */
export interface AppProcess {
  /** 프로세스를 끝낸다. 저장은 부르는 쪽이 먼저 마친다 (START-08). */
  exit(): Promise<void>;
  /** 메뉴 막대 "종료"(MAC-04)나 창 닫기처럼 OS 쪽에서 종료를 청하면 부른다. 돌려준 함수를 부르면 그만 받는다. */
  onQuitRequested(listener: () => void): () => void;
}
