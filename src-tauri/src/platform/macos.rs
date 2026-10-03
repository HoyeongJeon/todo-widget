//! macOS 전용: Dock 숨김, 메뉴 막대 아이콘, 모든 Spaces, 전체 화면 위 표시, 로그인 항목.
use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, WebviewWindow,
};

/// Dock과 Cmd+Tab에 나오지 않게 한다 (MAC-02).
pub fn hide_from_dock(app: &mut App) {
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);
}

/// 메뉴 막대 아이콘 (MAC-03, MAC-04). 문구는 계획 5에서 다국어 사전으로 바꾼다.
pub fn install_tray(app: &App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "열기", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;
    TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().expect("기본 아이콘이 없어요").clone())
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => crate::bring_to_front(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                crate::bring_to_front(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

/// 모든 Spaces에 따라다니고(MAC-06), 📌가 켜져 있으면 전체 화면 앱 위에도 뜬다(MAC-07).
pub fn set_full_screen_auxiliary(window: &WebviewWindow, pinned: bool) {
    let Ok(pointer) = window.ns_window() else { return };
    let address = pointer as usize;
    let _ = window.run_on_main_thread(move || {
        // SAFETY: Tauri가 준 NSWindow 포인터이고, 메인 스레드에서만 쓴다.
        let ns_window: &NSWindow = unsafe { &*(address as *const NSWindow) };
        let mut behavior = ns_window.collectionBehavior() | NSWindowCollectionBehavior::CanJoinAllSpaces;
        if pinned {
            behavior |= NSWindowCollectionBehavior::FullScreenAuxiliary;
        } else {
            behavior &= !NSWindowCollectionBehavior::FullScreenAuxiliary;
        }
        ns_window.setCollectionBehavior(behavior);
    });
}

/// 로그인 항목 시험 (계획 2 Task 7). action: "status" | "register" | "unregister".
pub fn probe_login_item(action: &str) -> String {
    use objc2_service_management::SMAppService;
    // SAFETY: SMAppService는 macOS 13 이상에서 쓸 수 있고, minimumSystemVersion이 13.0이다.
    let service = unsafe { SMAppService::mainAppService() };
    let result = match action {
        "register" => unsafe { service.registerAndReturnError() }.map_err(|e| format!("{e:?}")),
        "unregister" => unsafe { service.unregisterAndReturnError() }.map_err(|e| format!("{e:?}")),
        _ => Ok(()),
    };
    format!("{result:?} {:?}", unsafe { service.status() })
}
