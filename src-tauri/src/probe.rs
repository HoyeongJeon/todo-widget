// 계획 2 시험 측정. 계획 6 출시 전에 지우거나 기본 꺼진 feature로 막는다.
//! 계획 2 위험 확인용 측정. TODOWIDGET_PROBE=1일 때만 찍는다.
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
