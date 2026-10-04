//! 창 위치와 크기를 한 번에 바꾸는 값. 따로 바꾸면 위·왼쪽 크기 조절 때 창이 떨린다 (WND-03).
//! 단위는 OS 좌표다. Windows는 실제 픽셀, macOS는 포인트(왼쪽 위가 원점).

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Frame {
    pub left: f64,
    pub top: f64,
    pub width: f64,
    pub height: f64,
}

impl Frame {
    /// Windows `SetWindowPos`용 정수 픽셀. 크기는 1 이상이다.
    pub fn to_pixels(self) -> (i32, i32, i32, i32) {
        let round = |value: f64| value.round() as i32;
        (
            round(self.left),
            round(self.top),
            round(self.width).max(1),
            round(self.height).max(1),
        )
    }
}

/// macOS(Cocoa)는 주 화면 왼쪽 아래가 원점이고 y가 위로 커진다. 왼쪽 위 원점의 top을 Cocoa의 y로 바꾼다.
pub fn cocoa_origin_y(frame: Frame, primary_screen_height: f64) -> f64 {
    primary_screen_height - (frame.top + frame.height)
}

#[cfg(test)]
mod tests {
    use super::*;

    const FRAME: Frame = Frame {
        left: 1576.4,
        top: 24.6,
        width: 320.0,
        height: 520.0,
    };

    /// WND-03 Windows는 반올림한 정수 픽셀로 바꾼다
    #[test]
    fn rounds_to_pixels() {
        assert_eq!(FRAME.to_pixels(), (1576, 25, 320, 520));
        assert_eq!(
            Frame {
                width: 0.2,
                height: -3.0,
                ..FRAME
            }
            .to_pixels(),
            (1576, 25, 1, 1)
        );
    }

    /// WND-03 macOS는 아래쪽 원점으로 바꾼다
    #[test]
    fn converts_top_to_cocoa_y() {
        assert_eq!(cocoa_origin_y(Frame { top: 24.0, ..FRAME }, 900.0), 356.0);
        // 주 화면 위쪽 모니터에 있는 창
        assert_eq!(
            cocoa_origin_y(
                Frame {
                    top: -1080.0,
                    height: 520.0,
                    ..FRAME
                },
                900.0
            ),
            1460.0
        );
    }
}
