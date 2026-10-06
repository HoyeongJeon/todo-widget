//! macOS 전용: Dock 숨김, 메뉴 막대 아이콘, 로그인 항목.
//! 모든 Spaces 따라다니기(MAC-06)는 `tauri.conf.json`의 `visibleOnAllWorkspaces: true`가 창을 만들 때
//! `CanJoinAllSpaces`를 켜서 한다. `FullScreenAuxiliary`는 켜지 않으므로 전체 화면 앱에서는
//! 📌와 관계없이 보이지 않는다(MAC-07).
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Manager, RunEvent, WebviewWindow, Wry,
};

use objc2::MainThreadMarker;
use objc2_app_kit::{NSScreen, NSWindow};
use objc2_foundation::{NSPoint, NSRect, NSSize};
use objc2_service_management::{SMAppService, SMAppServiceStatus};
use todowidget_core::autostart::{AutoStart, LoginItem, LoginItemAutoStart, LoginItemStatus};
use todowidget_core::frame::{cocoa_origin_y, Frame};

/// JS `DesktopOs`와 같은 이름. `app_info` 명령이 돌려준다.
pub const OS_NAME: &str = "macos";

/// Dock과 Cmd+Tab에 나오지 않게 한다 (MAC-02).
fn hide_from_dock(app: &mut App) {
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);
}

/// 메뉴 막대 메뉴의 두 항목. 글은 JS가 화면 언어 사전으로 바꾼다(`set_tray_labels`, MAC-04, I18N-02).
struct TrayLabels {
    open: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

/// 메뉴 막대 아이콘 (MAC-03, MAC-04). 아이콘은 하는 중 동그라미 template 이미지라 밝은·어두운 메뉴 막대에서 OS가 색을 바꾼다.
fn install_tray(app: &App) -> tauri::Result<()> {
    // 화면이 사전 문구로 바꾸기 전 잠깐의 기본값이다. Rust에는 화면 언어 사전을 두지 않는다.
    let open = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;
    TrayIconBuilder::with_id("main")
        // 36×36 한 장이다. tray-icon이 높이를 18pt로 맞추므로 @2x 해상도가 된다.
        .icon(tauri::include_image!("icons/tray-template.png"))
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => crate::commands::reveal(app),
            "quit" => crate::commands::request_quit(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                crate::commands::reveal(tray.app_handle());
            }
        })
        .build(app)?;
    app.manage(TrayLabels { open, quit });
    Ok(())
}

/// 메뉴 막대 메뉴 글을 화면 언어 문구로 바꾼다 (MAC-04).
pub fn set_tray_labels(app: &AppHandle, open: &str, quit: &str) {
    if let Some(labels) = app.try_state::<TrayLabels>() {
        let _ = labels.open.set_text(open);
        let _ = labels.quit.set_text(quit);
    }
}

/// Dock 숨김과 메뉴 막대 아이콘 (MAC-02, MAC-03, MAC-04).
pub fn setup(app: &mut App) -> tauri::Result<()> {
    hide_from_dock(app);
    install_tray(app)
}

/// Spotlight·응용 프로그램 폴더에서 다시 열면 macOS가 Reopen을 보낸다 (MAC-05).
pub fn on_run_event(app: &AppHandle, event: RunEvent) {
    if let RunEvent::Reopen { .. } = event {
        crate::commands::reveal(app);
    }
}

/// 앱 자체를 로그인 항목으로 (MAC-08, macOS 13 이상).
struct MainAppLoginItem;

impl LoginItem for MainAppLoginItem {
    fn status(&self) -> LoginItemStatus {
        // SAFETY: SMAppService는 macOS 13 이상에서 쓸 수 있고, minimumSystemVersion이 13.0이다.
        let status = unsafe { SMAppService::mainAppService().status() };
        match status {
            SMAppServiceStatus::Enabled => LoginItemStatus::Enabled,
            SMAppServiceStatus::RequiresApproval => LoginItemStatus::RequiresApproval,
            SMAppServiceStatus::NotFound => LoginItemStatus::NotFound,
            _ => LoginItemStatus::NotRegistered,
        }
    }

    fn register(&self) -> Result<(), String> {
        // SAFETY: 위와 같다.
        unsafe { SMAppService::mainAppService().registerAndReturnError() }
            .map_err(|error| error.localizedDescription().to_string())
    }

    fn unregister(&self) -> Result<(), String> {
        // SAFETY: 위와 같다.
        unsafe { SMAppService::mainAppService().unregisterAndReturnError() }
            .map_err(|error| error.localizedDescription().to_string())
    }
}

/// 자동 실행 (MAC-08). 판정은 `todowidget_core::autostart::LoginItemAutoStart`가 한다.
pub fn auto_start() -> Box<dyn AutoStart> {
    Box::new(LoginItemAutoStart::new(MainAppLoginItem))
}

/// 포인트 좌표로 창 영역을 한 번에 바꾼다 (WND-03). AppKit은 메인 스레드에서만 부른다.
pub fn set_frame(window: &WebviewWindow, frame: Frame) -> Result<(), String> {
    let ns_window = window.ns_window().map_err(|e| e.to_string())? as usize;
    window
        .run_on_main_thread(move || {
            let mtm = MainThreadMarker::new().expect("메인 스레드에서 불러야 해요");
            // SAFETY: Tauri가 준 이 창의 NSWindow 포인터이고, 창이 살아 있는 동안 메인 스레드에서만 쓴다.
            let ns_window = unsafe { &*(ns_window as *const NSWindow) };
            // 첫 화면이 메뉴 막대가 있는 주 화면이고, Cocoa 좌표의 원점이다.
            let primary_height = NSScreen::screens(mtm)
                .firstObject()
                .map_or(0.0, |screen| screen.frame().size.height);
            let origin = NSPoint::new(frame.left, cocoa_origin_y(frame, primary_height));
            ns_window.setFrame_display(NSRect::new(origin, NSSize::new(frame.width, frame.height)), true);
        })
        .map_err(|e| e.to_string())
}
