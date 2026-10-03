use tauri::{AppHandle, Manager};

/// 창을 앞으로 가져온다. 처음 띄울 때와 다시 부를 때 같이 쓴다.
pub(crate) fn bring_to_front(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 화면이 준비되면 JS가 부른다. 숨긴 창에서는 requestAnimationFrame이 오지 않으므로 mount 직후에 부른다.
#[tauri::command]
fn show_main(app: AppHandle, painted_at_ms: f64) {
    let _ = painted_at_ms;
    bring_to_front(&app);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![show_main])
        .run(tauri::generate_context!())
        .expect("TodoWidget을 실행하지 못했어요");
}
