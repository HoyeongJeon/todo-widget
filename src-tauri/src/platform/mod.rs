//! OS마다 다른 앱 동작. 이 모듈과 `crates/windows` 밖에는 OS 분기를 두지 않는다 (설계 문서 5.4).
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::{auto_start, on_run_event, set_frame, set_tray_labels, setup, OS_NAME};

#[cfg(windows)]
mod windows;
#[cfg(windows)]
pub use windows::{auto_start, on_run_event, set_frame, set_tray_labels, setup, OS_NAME};

#[cfg(not(any(target_os = "macos", windows)))]
compile_error!("TodoWidget은 Windows와 macOS만 지원해요");
