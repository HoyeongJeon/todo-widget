//! macOS 전용: Dock 숨김, 메뉴 막대 아이콘, 로그인 항목.
//! 모든 Spaces 따라다니기(MAC-06)는 `tauri.conf.json`의 `visibleOnAllWorkspaces: true`가 창을 만들 때
//! `CanJoinAllSpaces`를 켜서 한다. `FullScreenAuxiliary`는 켜지 않으므로 전체 화면 앱에서는
//! 📌와 관계없이 보이지 않는다(MAC-07).
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, RunEvent,
};

use objc2_service_management::{SMAppService, SMAppServiceStatus};
use todowidget_core::autostart::{AutoStart, LoginItem, LoginItemAutoStart, LoginItemStatus};

/// Dock과 Cmd+Tab에 나오지 않게 한다 (MAC-02).
fn hide_from_dock(app: &mut App) {
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);
}

/// 메뉴 막대 아이콘 (MAC-03, MAC-04). 문구는 계획 5에서 다국어 사전으로 바꾼다.
fn install_tray(app: &App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "열기", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;
    TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().expect("기본 아이콘이 없어요").clone())
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => crate::commands::bring_to_front(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                crate::commands::bring_to_front(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

/// Dock 숨김과 메뉴 막대 아이콘 (MAC-02, MAC-03, MAC-04).
pub fn setup(app: &mut App) -> tauri::Result<()> {
    hide_from_dock(app);
    install_tray(app)
}

/// Spotlight·응용 프로그램 폴더에서 다시 열면 macOS가 Reopen을 보낸다 (MAC-05).
pub fn on_run_event(app: &AppHandle, event: RunEvent) {
    if let RunEvent::Reopen { .. } = event {
        crate::commands::bring_to_front(app);
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
