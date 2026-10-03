mod platform;
mod probe;

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
    probe::report_shown(painted_at_ms);
    bring_to_front(&app);
}

/// 📌 맨 위 고정 (WND-09). macOS는 전체 화면 위 표시도 함께 바꾼다 (MAC-07).
#[tauri::command]
fn set_pinned(app: AppHandle, pinned: bool) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(pinned);
        #[cfg(target_os = "macos")]
        platform::macos::set_full_screen_auxiliary(&window, pinned);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    probe::mark_process_start();

    #[cfg(target_os = "macos")]
    if let Some(position) = std::env::args().position(|a| a == "--probe-login-item") {
        let action = std::env::args().nth(position + 1).unwrap_or_else(|| "status".into());
        println!("{}", platform::macos::probe_login_item(&action));
        return;
    }

    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![show_main, set_pinned])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                platform::macos::hide_from_dock(app);
                platform::macos::install_tray(app)?;
                if let Some(window) = app.get_webview_window("main") {
                    platform::macos::set_full_screen_auxiliary(&window, true);
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("TodoWidget을 실행하지 못했어요");

    app.run(|app, event| {
        // Spotlight·응용 프로그램 폴더에서 다시 열면 macOS가 Reopen을 보낸다 (MAC-05).
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = event {
            bring_to_front(app);
        }
        let _ = (app, event);
    });
}
