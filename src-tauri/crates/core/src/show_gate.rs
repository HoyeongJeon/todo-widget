//! 화면(JS)이 `show_main`을 부르지 않을 때 창을 띄우는 대비책. JS가 실패해도 창이 숨은 채로 남지 않게 한다.
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

/// 이 시간 안에 `show_main`이나 `keep_hidden`이 오지 않으면 Rust가 창을 띄운다.
pub const SHOW_FALLBACK_DELAY: Duration = Duration::from_secs(3);

/// 창을 띄울지 숨긴 채 둘지는 한 번만 정한다. `show_main`, `keep_hidden`(STORE-10 대화 상자), 대비책 중 먼저 온 쪽이 정한다.
#[derive(Debug, Default)]
pub struct ShowGate {
    decided: AtomicBool,
}

impl ShowGate {
    /// 처음 부른 쪽만 `true`를 받는다.
    pub fn claim(&self) -> bool {
        !self.decided.swap(true, Ordering::SeqCst)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    #[test]
    fn first_claim_wins() {
        let gate = ShowGate::default();
        assert!(gate.claim());
        assert!(!gate.claim());
    }

    #[test]
    fn only_one_thread_wins() {
        let gate = Arc::new(ShowGate::default());
        let handles: Vec<_> = (0..8)
            .map(|_| {
                let gate = Arc::clone(&gate);
                std::thread::spawn(move || gate.claim())
            })
            .collect();
        let winners = handles
            .into_iter()
            .map(|h| h.join().unwrap())
            .filter(|won| *won)
            .count();
        assert_eq!(winners, 1);
    }

    #[test]
    fn fallback_waits_three_seconds() {
        assert_eq!(SHOW_FALLBACK_DELAY, Duration::from_secs(3));
    }
}
