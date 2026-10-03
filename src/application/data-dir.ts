/** 개발 중에는 환경 변수 TODOWIDGET_DATA_DIR로 데이터 폴더를 바꾼다. 없거나 빈 문자열이면 OS 기본 폴더 (STORE-18). */
export function resolveDataDir(envValue: string | null | undefined, osDefault: string): string {
  return envValue ? envValue : osDefault;
}
