import type { Invoke } from './invoke.ts';

/** macOS 메뉴 막대 메뉴의 "열기"·"종료" 글 (MAC-04). 화면 언어 사전에서 꺼낸 글을 넘긴다(I18N-02). Windows에서는 Rust가 아무것도 하지 않는다. */
export async function setTrayLabels(invoke: Invoke, labels: { open: string; quit: string }): Promise<void> {
  await invoke('set_tray_labels', { open: labels.open, quit: labels.quit });
}
