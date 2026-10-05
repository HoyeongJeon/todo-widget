//! Windows 전용 앱 동작. 작업 표시줄 숨김(WIN-02)은 `tauri.conf.json`의 `skipTaskbar: true`로 한다.
use tauri::{App, AppHandle, RunEvent, WebviewWindow};
use todowidget_core::autostart::{AutoStart, RunKeyAutoStart, RUN_VALUE_NAME};
use todowidget_core::frame::Frame;
use todowidget_windows::run_key::HkcuRunKey;

/// JS `DesktopOs`와 같은 이름. `app_info` 명령이 돌려준다.
pub const OS_NAME: &str = "windows";

pub fn setup(_app: &mut App) -> tauri::Result<()> {
    Ok(())
}

pub fn on_run_event(_app: &AppHandle, _event: RunEvent) {}

/// 자동 실행 (WIN-03, WIN-04). 판정은 `todowidget_core::autostart::RunKeyAutoStart`가 한다.
/// 실행 파일 위치를 알아내지 못하면 빈 경로를 넘긴다. 그러면 켜기와 경로 맞추기는 Run 값을 쓰지 않고 오류를 돌려준다.
pub fn auto_start() -> Box<dyn AutoStart> {
    let exe = std::env::current_exe().unwrap_or_default();
    Box::new(RunKeyAutoStart::new(HkcuRunKey::new(RUN_VALUE_NAME), exe))
}

/// 실제 픽셀로 창 위치와 크기를 한 번에 바꾼다 (WND-03).
pub fn set_frame(window: &WebviewWindow, frame: Frame) -> Result<(), String> {
    let hwnd = window.hwnd().map_err(|e| e.to_string())?.0 as isize;
    let (left, top, width, height) = frame.to_pixels();
    todowidget_windows::frame::set_window_frame(hwnd, left, top, width, height)
}
