//! 화면(JS)이 `show_main`을 부르지 않을 때 창을 띄우는 대비책. JS가 실패해도 창이 숨은 채로 남지 않게 한다.
//! 시작하지 못해 대화 상자만 띄울 때(STORE-10)는 다시 실행·메뉴 막대 아이콘도 빈 창을 띄우지 않게 이 결정을 본다.
use std::sync::atomic::{AtomicU8, Ordering};
use std::time::Duration;

/// 이 시간 안에 `show_main`이나 `keep_hidden`이 오지 않으면 Rust가 창을 띄운다.
pub const SHOW_FALLBACK_DELAY: Duration = Duration::from_secs(3);

const UNDECIDED: u8 = 0;
const SHOWN: u8 = 1;
const HIDDEN: u8 = 2;

/// 창을 띄울지 숨긴 채 둘지.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Decision {
    /// `show_main`이나 대비책이 띄웠다.
    Shown,
    /// `keep_hidden`(STORE-10 대화 상자). 끝날 때까지 창을 띄우지 않는다.
    Hidden,
}

impl Decision {
    fn to_u8(self) -> u8 {
        match self {
            Decision::Shown => SHOWN,
            Decision::Hidden => HIDDEN,
        }
    }
}

/// 창을 띄울지 숨긴 채 둘지는 한 번만 정한다. `show_main`, `keep_hidden`(STORE-10 대화 상자), 대비책 중 먼저 온 쪽이 정한다.
#[derive(Debug, Default)]
pub struct ShowGate {
    state: AtomicU8,
}

impl ShowGate {
    /// 아직 정하지 않았으면 `decision`으로 정하고 `true`를 준다. 이미 정했으면 바꾸지 않고 `false`를 준다.
    pub fn claim(&self, decision: Decision) -> bool {
        self.state
            .compare_exchange(UNDECIDED, decision.to_u8(), Ordering::SeqCst, Ordering::SeqCst)
            .is_ok()
    }

    /// 이미 띄우기로 정했어도 숨긴 채 두기로 바꾼다. STORE-10 대화 상자를 띄운 뒤에는 앱이 곧 끝나므로 늘 숨김이 맞다.
    /// 시작이 `SHOW_FALLBACK_DELAY`를 넘겨 대비책이 먼저 창을 띄운 경우에도 대화 상자 뒤에 빈 창이 남지 않게 한다.
    pub fn hide(&self) {
        self.state.store(HIDDEN, Ordering::SeqCst);
    }

    /// 정한 결과. 아직 정하지 않았으면 `None`.
    pub fn decision(&self) -> Option<Decision> {
        match self.state.load(Ordering::SeqCst) {
            SHOWN => Some(Decision::Shown),
            HIDDEN => Some(Decision::Hidden),
            _ => None,
        }
    }

    /// 숨긴 채 두기로 정했으면 `true`. 다시 실행·메뉴 막대 아이콘·Reopen은 이때 창을 띄우지 않는다.
    pub fn is_hidden(&self) -> bool {
        self.decision() == Some(Decision::Hidden)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    #[test]
    fn first_claim_wins() {
        let gate = ShowGate::default();
        assert!(gate.claim(Decision::Shown));
        assert!(!gate.claim(Decision::Shown));
        assert!(!gate.claim(Decision::Hidden));
        assert_eq!(gate.decision(), Some(Decision::Shown));
    }

    #[test]
    fn only_one_thread_wins() {
        let gate = Arc::new(ShowGate::default());
        let handles: Vec<_> = (0..8)
            .map(|i| {
                let gate = Arc::clone(&gate);
                let decision = if i % 2 == 0 { Decision::Shown } else { Decision::Hidden };
                std::thread::spawn(move || gate.claim(decision))
            })
            .collect();
        let winners = handles
            .into_iter()
            .map(|h| h.join().unwrap())
            .filter(|won| *won)
            .count();
        assert_eq!(winners, 1);
        assert!(gate.decision().is_some());
    }

    /// STORE-10 숨긴 채 두기로 먼저 정하면 대비책과 다시 실행이 창을 띄우지 않는다
    #[test]
    fn hidden_wins_over_later_show() {
        let gate = ShowGate::default();
        assert!(gate.claim(Decision::Hidden));
        assert!(!gate.claim(Decision::Shown));
        assert_eq!(gate.decision(), Some(Decision::Hidden));
        assert!(gate.is_hidden());
    }

    /// STORE-10 정하기 전과 띄우기로 정한 뒤에는 숨긴 상태가 아니다
    #[test]
    fn is_hidden_only_after_hidden_decision() {
        let gate = ShowGate::default();
        assert_eq!(gate.decision(), None);
        assert!(!gate.is_hidden());
        gate.claim(Decision::Shown);
        assert!(!gate.is_hidden());
    }

    /// STORE-10 대비책이 먼저 창을 띄웠어도 숨긴 채 두기가 이긴다
    #[test]
    fn hide_overrides_shown() {
        let gate = ShowGate::default();
        assert!(gate.claim(Decision::Shown));
        gate.hide();
        assert_eq!(gate.decision(), Some(Decision::Hidden));
        assert!(gate.is_hidden());
        assert!(!gate.claim(Decision::Shown));
    }

    #[test]
    fn fallback_waits_three_seconds() {
        assert_eq!(SHOW_FALLBACK_DELAY, Duration::from_secs(3));
    }
}
