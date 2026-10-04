mod commands;
mod platform;
mod probe;

use todowidget_core::show_gate::ShowGate;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 계획 2 시험 측정. 계획 6 출시 전에 지우거나 기본 꺼진 feature로 막는다.
    probe::mark_process_start();

    let app = tauri::Builder::default()
        // 가장 먼저 등록한다. 두 번째 프로세스는 창을 만들거나 파일을 읽기 전에 끝나고, 떠 있는 위젯이 앞으로 온다 (START-01, WIN-07, MAC-05).
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            commands::bring_to_front(app)
        }))
        .manage(ShowGate::default())
        .invoke_handler(tauri::generate_handler![
            commands::show_main,
            commands::keep_hidden,
            commands::set_pinned
        ])
        .setup(|app| {
            platform::setup(app)?;
            commands::spawn_show_fallback(app.handle().clone());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("TodoWidget을 실행하지 못했어요");

    app.run(platform::on_run_event);
}
