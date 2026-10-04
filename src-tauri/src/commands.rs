//! JS가 부르는 Tauri 명령과 그 명령들이 함께 쓰는 창 동작.
use tauri::{AppHandle, Manager, State};
use todowidget_core::show_gate::{ShowGate, SHOW_FALLBACK_DELAY};

use crate::probe;

/// 창을 앞으로 가져온다. 처음 띄울 때, 다시 실행했을 때(START-01), 메뉴 막대 아이콘을 눌렀을 때(MAC-03) 같이 쓴다.
pub fn bring_to_front(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 화면이 준비되면 JS가 부른다. 숨긴 창에서는 requestAnimationFrame이 오지 않으므로 mount 직후에 부른다.
#[tauri::command]
pub fn show_main(app: AppHandle, gate: State<'_, ShowGate>, painted_at_ms: f64) {
    // 계획 2 시험 측정. 계획 6 출시 전에 지우거나 기본 꺼진 feature로 막는다.
    probe::report_shown(painted_at_ms);
    let _ = gate.claim();
    bring_to_front(&app);
}

/// 시작하지 못해 대화 상자만 띄우고 끝낼 때(STORE-10) 대비책이 빈 창을 띄우지 않게 한다.
#[tauri::command]
pub fn keep_hidden(gate: State<'_, ShowGate>) {
    let _ = gate.claim();
}

/// 📌 맨 위 고정 (WND-09). 맨 위 고정만 바꾼다. macOS 전체 화면 앱에서는 📌와 관계없이 보이지 않는다 (MAC-07).
#[tauri::command]
pub fn set_pinned(app: AppHandle, pinned: bool) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(pinned);
    }
}

/// `SHOW_FALLBACK_DELAY` 안에 화면이 창을 띄우지 않으면 Rust가 띄운다.
pub fn spawn_show_fallback(app: AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(SHOW_FALLBACK_DELAY);
        if app.state::<ShowGate>().claim() {
            bring_to_front(&app);
        }
    });
}
