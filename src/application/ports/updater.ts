/** GitHub Release의 latest.json과 업데이트 파일 (UPD-02, UPD-08). 실제 구현은 계획 4의 updater adapter. */
export interface Updater {
  /** latest.json을 읽어 그 버전을 돌려준다. 인터넷 없음·서버 오류·형식 오류면 던진다 (UPD-06). */
  fetchLatest(): Promise<{ version: string }>;
  /** 받아서 서명을 확인하고 설치한 뒤 다시 띄운다. 받기·설치 실패나 서명 불일치면 던진다 (UPD-07, UPD-08). */
  downloadAndInstall(): Promise<void>;
}
