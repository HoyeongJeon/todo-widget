//! Windows 전용 앱 동작. 작업 표시줄 숨김(WIN-02)은 `tauri.conf.json`의 `skipTaskbar: true`로 한다.
use tauri::{App, AppHandle, RunEvent};
use todowidget_core::autostart::{AutoStart, RunKeyAutoStart, RUN_VALUE_NAME};
use todowidget_windows::run_key::HkcuRunKey;

pub fn setup(_app: &mut App) -> tauri::Result<()> {
    Ok(())
}

pub fn on_run_event(_app: &AppHandle, _event: RunEvent) {}

/// 자동 실행 (WIN-03, WIN-04). 판정은 `todowidget_core::autostart::RunKeyAutoStart`가 한다.
pub fn auto_start() -> Box<dyn AutoStart> {
    let exe = std::env::current_exe().unwrap_or_default();
    Box::new(RunKeyAutoStart::new(HkcuRunKey::new(RUN_VALUE_NAME), exe))
}
