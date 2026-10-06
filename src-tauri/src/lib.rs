mod commands;
mod platform;
mod probe;

use tauri::Manager;
use todowidget_core::files::{os_data_dir, resolve_data_dir, DataDir, DATA_DIR_ENV};
use todowidget_core::show_gate::ShowGate;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // PERF-01 측정. probe feature가 없으면 아무것도 하지 않는다 (probe.rs).
    probe::mark_process_start();

    let data_dir =
        resolve_data_dir(std::env::var_os(DATA_DIR_ENV), os_data_dir()).expect("데이터 폴더 위치를 찾지 못했어요");

    let app = tauri::Builder::default()
        // 가장 먼저 등록한다. 두 번째 프로세스는 창을 만들거나 파일을 읽기 전에 끝나고, 떠 있는 위젯이 앞으로 온다 (START-01, WIN-07, MAC-05).
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            commands::reveal(app)
        }))
        // 업데이트 확인·설치 (UPD-01~08). 네트워크 요청은 이 plugin 하나뿐이다 (PRIV-01).
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // STORE-10 오류 대화 상자. JS는 이 plugin을 직접 부르지 않고 `commands::show_error_dialog`를 부른다.
        .plugin(tauri_plugin_dialog::init())
        .manage(ShowGate::default())
        .manage(DataDir::new(data_dir))
        .manage(commands::auto_start::AutoStartState(platform::auto_start()))
        .invoke_handler(tauri::generate_handler![
            commands::show_main,
            commands::keep_hidden,
            commands::set_pinned,
            commands::set_tray_labels,
            commands::set_frame,
            commands::files::data_dir_info,
            commands::files::data_file_read,
            commands::files::data_file_write_atomic,
            commands::files::data_file_exists,
            commands::files::data_file_rename,
            commands::files::data_file_copy,
            commands::auto_start::auto_start_is_enabled,
            commands::auto_start::auto_start_enable,
            commands::auto_start::auto_start_disable,
            commands::auto_start::auto_start_refresh,
            commands::app_info,
            commands::os_locale,
            commands::quit_app,
            commands::show_error_dialog
        ])
        // Alt+F4 같은 창 닫기도 종료 흐름을 거쳐 위치를 저장한다 (WND-14).
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                commands::request_quit(window.app_handle());
            }
        })
        .setup(|app| {
            platform::setup(app)?;
            commands::spawn_show_fallback(app.handle().clone());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("TodoWidget을 실행하지 못했어요");

    app.run(platform::on_run_event);
}
