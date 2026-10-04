//! 창 위치와 크기를 한 번에 바꾼다 (WND-03).
use windows_sys::Win32::UI::WindowsAndMessaging::{SetWindowPos, SWP_NOACTIVATE, SWP_NOZORDER};

/// `hwnd`는 살아 있는 창 핸들이어야 한다. 값은 실제 픽셀이다.
pub fn set_window_frame(hwnd: isize, left: i32, top: i32, width: i32, height: i32) -> Result<(), String> {
    // SAFETY: 호출하는 쪽(Tauri 창)이 살아 있는 창 핸들을 넘긴다. 다른 창의 순서는 바꾸지 않는다.
    let ok = unsafe {
        SetWindowPos(
            hwnd as _,
            std::ptr::null_mut(),
            left,
            top,
            width,
            height,
            SWP_NOZORDER | SWP_NOACTIVATE,
        )
    };
    if ok == 0 {
        Err(std::io::Error::last_os_error().to_string())
    } else {
        Ok(())
    }
}
