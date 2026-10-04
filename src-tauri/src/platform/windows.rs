//! Windows 전용 앱 동작. 작업 표시줄 숨김(WIN-02)은 `tauri.conf.json`의 `skipTaskbar: true`로 한다.
use tauri::{App, AppHandle, RunEvent};

pub fn setup(_app: &mut App) -> tauri::Result<()> {
    Ok(())
}

pub fn on_run_event(_app: &AppHandle, _event: RunEvent) {}
