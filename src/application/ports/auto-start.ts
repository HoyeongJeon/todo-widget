/** OS 자동 실행 등록. 등록 여부가 기준이고 파일에 저장하지 않는다 (startup.md 용어). 실패하면 던진다. */
export interface AutoStart {
  /** OS가 실제로 허용한 상태 (WIN-03, MAC-08). */
  isEnabled(): Promise<boolean>;
  /** 지금 실행 파일로 등록해 켠다. */
  enable(): Promise<void>;
  /** 등록을 지워 끈다. 이미 꺼져 있어도 오류가 아니다 (START-04). */
  disable(): Promise<void>;
  /** 등록이 남아 있으면 지금 실행 파일로 갱신한다. 꺼진 상태는 바꾸지 않는다 (START-03). */
  refresh(): Promise<void>;
}
