//! Windows API. 앱 crate와 달리 Tauri를 링크하지 않아 Windows CI에서 테스트를 돌릴 수 있고, Mac에서도 `cargo check --target x86_64-pc-windows-msvc`로 검사할 수 있다.
#![cfg(windows)]
pub mod run_key;
