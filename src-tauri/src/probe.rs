//! PERF-01 측정. `probe` feature로 빌드하고 TODOWIDGET_PROBE=1로 켤 때만 찍는다.
//! 출시 빌드에는 feature가 없어 두 함수가 아무것도 하지 않는다 (계획 6 D8).

#[cfg(feature = "probe")]
mod imp {
    use std::sync::OnceLock;
    use std::time::Instant;

    static STARTED: OnceLock<Instant> = OnceLock::new();

    pub fn mark_process_start() {
        let _ = STARTED.set(Instant::now());
    }

    pub fn report_shown(painted_at_ms: f64) {
        if std::env::var_os("TODOWIDGET_PROBE").is_none() {
            return;
        }
        if let Some(started) = STARTED.get() {
            eprintln!(
                "probe: shown {}ms after process start (first paint {painted_at_ms:.0}ms after JS start)",
                started.elapsed().as_millis()
            );
        }
    }
}

#[cfg(feature = "probe")]
pub use imp::{mark_process_start, report_shown};

#[cfg(not(feature = "probe"))]
pub fn mark_process_start() {}

#[cfg(not(feature = "probe"))]
pub fn report_shown(_painted_at_ms: f64) {}
