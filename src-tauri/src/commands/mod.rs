//! JS가 부르는 Tauri 명령과 그 명령들이 함께 쓰는 창 동작.
pub mod auto_start;
pub mod files;

use serde::Serialize;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};
use todowidget_core::frame::Frame;
use todowidget_core::show_gate::{Decision, ShowGate, SHOW_FALLBACK_DELAY};

use crate::probe;

/// JS가 이 시간 안에 저장을 마치고 끝내지 않으면 Rust가 끝낸다.
const QUIT_FALLBACK_DELAY: Duration = Duration::from_secs(3);
/// JS `src/adapters/tauri/process.ts`의 `QUIT_REQUESTED_EVENT`와 같다.
const QUIT_EVENT: &str = "quit-requested";

/// 창을 앞으로 가져온다. 처음 띄울 때와 `reveal`이 같이 쓴다.
pub fn bring_to_front(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 가려진 위젯 꺼내기: 다시 실행했을 때(START-01), 메뉴 막대 아이콘·"열기"(MAC-03), Reopen(MAC-05).
/// STORE-10 대화 상자 때문에 숨긴 채 두기로 했으면 빈 창을 띄우지 않는다.
/// 아직 정하지 않았으면(화면 준비 전) 띄우되 결정은 하지 않는다. 뒤에 오는 `keep_hidden`이 이길 수 있게 하기 위해서다.
pub fn reveal(app: &AppHandle) {
    if !app.state::<ShowGate>().is_hidden() {
        bring_to_front(app);
    }
}

/// 화면이 준비되면 JS가 부른다. 숨긴 창에서는 requestAnimationFrame이 오지 않으므로 mount 직후에 부른다.
/// `keep_hidden` 뒤에 불러도 창을 띄운다. 두 명령 모두 JS가 부르므로 JS가 순서를 책임진다.
#[tauri::command]
pub fn show_main(app: AppHandle, gate: State<'_, ShowGate>, painted_at_ms: f64) {
    // 계획 2 시험 측정. 계획 6 출시 전에 지우거나 기본 꺼진 feature로 막는다.
    probe::report_shown(painted_at_ms);
    let _ = gate.claim(Decision::Shown);
    bring_to_front(&app);
}

/// 시작하지 못해 대화 상자만 띄우고 끝낼 때(STORE-10) 대비책·다시 실행·메뉴 막대 아이콘이 빈 창을 띄우지 않게 한다.
/// 화면 준비 전에 다시 실행해 이미 창이 떠 있었다면 다시 숨긴다.
#[tauri::command]
pub fn keep_hidden(app: AppHandle, gate: State<'_, ShowGate>) {
    if gate.claim(Decision::Hidden) {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.hide();
        }
    }
}

/// 📌 맨 위 고정 (WND-09). 맨 위 고정만 바꾼다. macOS 전체 화면 앱에서는 📌와 관계없이 보이지 않는다 (MAC-07).
#[tauri::command]
pub fn set_pinned(app: AppHandle, pinned: bool) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(pinned);
    }
}

/// 창 위치와 크기를 한 번에 바꾼다. 값은 OS 좌표다(Windows 실제 픽셀, macOS 포인트). 변환은 JS `coordinates.ts`가 한다.
#[tauri::command]
pub fn set_frame(app: AppHandle, left: f64, top: f64, width: f64, height: f64) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("창이 없어요")?;
    crate::platform::set_frame(
        &window,
        Frame {
            left,
            top,
            width,
            height,
        },
    )
}

/// `SHOW_FALLBACK_DELAY` 안에 화면이 창을 띄우지 않으면 Rust가 띄운다.
pub fn spawn_show_fallback(app: AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(SHOW_FALLBACK_DELAY);
        if app.state::<ShowGate>().claim(Decision::Shown) {
            bring_to_front(&app);
        }
    });
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    version: String,
    is_dev_build: bool,
    os: &'static str,
}

/// 앱 버전과 개발 빌드 여부(START-07), OS.
#[tauri::command]
pub fn app_info(app: AppHandle) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        is_dev_build: cfg!(debug_assertions),
        os: if cfg!(windows) { "windows" } else { "macos" },
    }
}

/// OS 언어(BCP 47). 화면 언어를 고르는 데 쓴다 (I18N-01).
#[tauri::command]
pub fn os_locale() -> Option<String> {
    sys_locale::get_locale()
}

/// JS 종료 흐름이 저장을 마친 뒤 부른다 (START-08).
#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}

/// OS 쪽 종료 요청(메뉴 막대 "종료", 창 닫기)을 JS 종료 흐름으로 넘긴다. 위치를 저장해야 하기 때문이다 (WND-14).
pub fn request_quit(app: &AppHandle) {
    let _ = app.emit(QUIT_EVENT, ());
    let app = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(QUIT_FALLBACK_DELAY);
        app.exit(0);
    });
}
