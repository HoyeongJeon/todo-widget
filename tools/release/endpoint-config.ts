export interface EndpointOverride {
  plugins: { updater: { endpoints: string[] } };
}

/**
 * 시험 빌드의 업데이트 확인 주소 (REL-10, UPD-09). `pnpm tauri build --config <이 JSON>`으로 겹쳐 쓴다.
 * 출시 workflow는 이것을 부르지 않고 TODOWIDGET_UPDATE_ENDPOINT가 비었는지 본다 (계획 6 D4).
 */
export function endpointOverride(value: string | undefined): EndpointOverride | null {
  if (!value)
    return null;
  if (!/^https:\/\/[^\s]+$/.test(value))
    throw new Error(`시험용 업데이트 주소는 https 주소여야 해요: ${value} (REL-10)`);
  return { plugins: { updater: { endpoints: [value] } } };
}
