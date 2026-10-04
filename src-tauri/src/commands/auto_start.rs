//! 자동 실행 명령. JS의 `AutoStart` adapter(`src/adapters/tauri/auto-start.ts`)가 부른다.
use tauri::State;
use todowidget_core::autostart::AutoStart;

pub struct AutoStartState(pub Box<dyn AutoStart>);

#[tauri::command]
pub async fn auto_start_is_enabled(state: State<'_, AutoStartState>) -> Result<bool, String> {
    state.0.is_enabled()
}

#[tauri::command]
pub async fn auto_start_enable(state: State<'_, AutoStartState>) -> Result<(), String> {
    state.0.enable()
}

#[tauri::command]
pub async fn auto_start_disable(state: State<'_, AutoStartState>) -> Result<(), String> {
    state.0.disable()
}

#[tauri::command]
pub async fn auto_start_refresh(state: State<'_, AutoStartState>) -> Result<(), String> {
    state.0.refresh()
}
