//! 작업 표시줄 버튼을 다시 눌렀을 때의 최소화 요청을 받는다 (WIN-11, WIN-12).
//!
//! 버튼을 누르면 위젯이 앞으로 오는 것은 Windows가 한다. 위젯이 활성 창일 때 누르면 Windows는 최소화를 요청한다.
//! 최소화하면 화면 밖 위치가 저장될 수 있어, 그 요청을 "뒤로 보내기"로 바꾼다. Tauri는 이 요청을 막는 방법을 주지 않아 창 메시지를 직접 본다.
use windows_sys::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
use windows_sys::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};
use windows_sys::Win32::UI::Shell::{DefSubclassProc, SetWindowSubclass};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetTopWindow, GetWindow, GetWindowLongPtrW, GetWindowTextLengthW, IsIconic, IsWindowVisible,
    SetForegroundWindow, SetWindowPos, GWL_EXSTYLE, GW_HWNDNEXT, HWND_BOTTOM, SC_MINIMIZE, SWP_NOACTIVATE, SWP_NOMOVE,
    SWP_NOSIZE, WM_SYSCOMMAND, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW, WS_EX_TOPMOST,
};

/// 이 창의 subclass 번호. 이 crate에서 하나만 쓴다.
const SUBCLASS_ID: usize = 1;

/// 창 메시지 하나를 보고 정한 일.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    /// 우리가 볼 메시지가 아니다. 그대로 흘려보낸다.
    Pass,
    /// 다른 창들 뒤로 보내고, 그 전에 쓰던 창을 활성 창으로 만든다.
    SendBehind,
    /// 위젯은 그대로 두고, 그 전에 쓰던 창을 활성 창으로 만든다.
    ActivatePrevious,
    /// 아무것도 하지 않고 메시지만 삼킨다.
    Swallow,
}

/// 창 메시지를 보고 할 일을 정한다 (WIN-12). `pinned`는 📌 맨 위 고정(WND-09)이 켜져 있는지다.
pub fn decide(msg: u32, wparam: usize, active: bool, pinned: bool) -> Action {
    // 아래 4비트는 Windows가 쓰는 값이라 떼고 비교한다.
    if msg != WM_SYSCOMMAND || wparam & 0xFFF0 != SC_MINIMIZE as usize {
        return Action::Pass;
    }
    match (active, pinned) {
        (true, false) => Action::SendBehind,
        (true, true) => Action::ActivatePrevious,
        (false, _) => Action::Swallow,
    }
}

/// 위젯 창의 최소화 요청을 지켜본다. `hwnd`는 살아 있는 창 핸들이어야 하고, 그 창을 만든 스레드에서 부른다.
pub fn watch(hwnd: isize) -> Result<(), String> {
    // SAFETY: 호출하는 쪽(Tauri 창)이 살아 있는 창 핸들을 그 창의 스레드에서 넘긴다.
    let ok = unsafe { SetWindowSubclass(hwnd as HWND, Some(subclass_proc), SUBCLASS_ID, 0) };
    if ok == 0 {
        Err("작업 표시줄 버튼을 지켜보지 못했어요".into())
    } else {
        Ok(())
    }
}

/// 위젯 창으로 오는 메시지를 먼저 받는다.
unsafe extern "system" fn subclass_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    _id: usize,
    _data: usize,
) -> LRESULT {
    // SAFETY: hwnd는 이 메시지를 받은 살아 있는 창이고, 받은 인자를 그대로 다음 처리기에 넘긴다.
    unsafe {
        // 메시지는 아주 자주 오므로 창 상태는 필요한 메시지에서만 읽는다.
        let command = msg == WM_SYSCOMMAND;
        let active = command && GetForegroundWindow() == hwnd;
        let pinned = command && ex_style(hwnd) & WS_EX_TOPMOST != 0;
        match decide(msg, wparam, active, pinned) {
            Action::Pass => return DefSubclassProc(hwnd, msg, wparam, lparam),
            Action::SendBehind => {
                SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
                activate_previous(hwnd);
            }
            Action::ActivatePrevious => activate_previous(hwnd),
            Action::Swallow => {}
        }
    }
    0
}

unsafe fn ex_style(hwnd: HWND) -> u32 {
    // SAFETY: 조회만 한다. 잘못된 핸들이면 0을 준다.
    unsafe { GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32 }
}

/// 위젯을 뺀 창들 중 맨 앞의 보통 창을 활성 창으로 만든다. 그러지 않으면 뒤로 간 위젯으로 글자가 들어간다.
/// 그런 창이 없으면 아무것도 하지 않는다.
unsafe fn activate_previous(widget: HWND) {
    // SAFETY: 모두 창 핸들을 받아 조회하는 함수이고, 잘못된 핸들에는 실패를 돌려줄 뿐이다.
    unsafe {
        let mut next = GetTopWindow(std::ptr::null_mut());
        while !next.is_null() {
            if next != widget && can_take_focus(next) {
                SetForegroundWindow(next);
                return;
            }
            next = GetWindow(next, GW_HWNDNEXT);
        }
    }
}

/// 사용자가 쓰던 창일 수 있는지. 안 보이는 창, 최소화된 창, 도구·맨 위 창은 뺀다.
unsafe fn can_take_focus(hwnd: HWND) -> bool {
    // SAFETY: 조회만 한다. `cloaked`는 호출이 끝날 때까지 살아 있다.
    unsafe {
        if IsWindowVisible(hwnd) == 0 || IsIconic(hwnd) != 0 || GetWindowTextLengthW(hwnd) == 0 {
            return false;
        }
        if ex_style(hwnd) & (WS_EX_TOOLWINDOW | WS_EX_TOPMOST | WS_EX_NOACTIVATE) != 0 {
            return false;
        }
        // 다른 가상 데스크톱의 창과 숨은 스토어 앱 창은 보이는 것으로 나오지만 가려져 있다.
        let mut cloaked = 0u32;
        DwmGetWindowAttribute(
            hwnd,
            DWMWA_CLOAKED as u32,
            (&raw mut cloaked).cast(),
            size_of::<u32>() as u32,
        );
        cloaked == 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use windows_sys::Win32::UI::WindowsAndMessaging::{SC_CLOSE, SC_MOVE, SC_RESTORE, WM_PAINT};

    const MINIMIZE: usize = SC_MINIMIZE as usize;

    /// WIN-12 활성 창이고 📌가 꺼져 있으면 뒤로 보낸다
    #[test]
    fn minimize_on_active_widget_sends_it_behind() {
        assert_eq!(decide(WM_SYSCOMMAND, MINIMIZE, true, false), Action::SendBehind);
    }

    /// WIN-12 📌가 켜져 있으면 위젯은 그대로 두고 그 전에 쓰던 창만 활성 창으로 만든다
    #[test]
    fn minimize_on_active_pinned_widget_only_activates_previous() {
        assert_eq!(decide(WM_SYSCOMMAND, MINIMIZE, true, true), Action::ActivatePrevious);
    }

    /// WIN-12 활성 창이 아닐 때 온 최소화 요청은 삼킨다 (`Win+M`)
    #[test]
    fn minimize_on_inactive_widget_is_swallowed() {
        assert_eq!(decide(WM_SYSCOMMAND, MINIMIZE, false, false), Action::Swallow);
        assert_eq!(decide(WM_SYSCOMMAND, MINIMIZE, false, true), Action::Swallow);
    }

    /// WIN-12 아래 4비트는 Windows가 쓰는 값이라 보지 않는다
    #[test]
    fn low_four_bits_are_ignored() {
        assert_eq!(decide(WM_SYSCOMMAND, MINIMIZE | 0x2, true, false), Action::SendBehind);
    }

    /// WIN-12 창을 끄는 요청, 닫는 요청과 다른 메시지는 그대로 처리한다
    #[test]
    fn other_messages_pass_through() {
        for command in [SC_CLOSE, SC_MOVE, SC_MOVE | 0x2, SC_RESTORE] {
            assert_eq!(decide(WM_SYSCOMMAND, command as usize, true, false), Action::Pass);
        }
        assert_eq!(decide(WM_PAINT, MINIMIZE, true, false), Action::Pass);
    }
}
