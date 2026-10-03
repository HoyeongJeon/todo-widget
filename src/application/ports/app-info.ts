export interface AppInfo {
  /** 지금 실행 중인 버전. 예: `2.0.0` (update.md "새 버전"). */
  readonly version: string;
  /** 개발용 빌드면 자동 실행을 건드리지 않는다 (START-07). */
  readonly isDevBuild: boolean;
}
