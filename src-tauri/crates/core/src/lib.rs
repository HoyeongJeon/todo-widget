//! Tauri 없이 테스트하는 로직. 앱 crate는 Tauri를 링크하므로 테스트를 두지 않는다(계획 2: Windows CI에서 테스트 실행 파일이 뜨지 않을 수 있다).
pub mod autostart;
pub mod files;
pub mod show_gate;
