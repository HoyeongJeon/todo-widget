/** 픽셀 단위 휠(트랙패드, Magic Mouse)은 세로로 이만큼 쌓일 때마다 한 칸으로 센다 (D26). */
export const PIXELS_PER_STEP = 50;

/** 끊어지는 마우스 휠 한 칸의 옛 값 `wheelDeltaY` 크기. Chromium(WebView2)과 WebKit이 같다 (D26). */
export const WHEEL_NOTCH = 120;

/** wheel 이벤트에서 쓰는 것. deltaMode 0은 픽셀, 1은 줄, 2는 쪽 단위다. */
export interface WheelLike {
  deltaY: number;
  deltaMode: number;
  /** OS 스크롤 방향 설정(macOS "자연스러운 스크롤") 때문에 deltaY가 실제 방향과 반대이면 true. WebKit의 `webkitDirectionInvertedFromDevice`다. */
  invertedFromDevice?: boolean;
  /** 옛 값. 마우스 휠은 한 칸에 ±120이다. 칸 수를 세는 데만 쓰고 방향은 deltaY로 정한다. */
  wheelDeltaY?: number;
}

/**
 * 투명도 슬라이더 위 휠을 "칸"으로 바꾼다 (WND-12 "한 칸에 2%"). 양수는 위로(더 투명하게), 음수는 아래로 굴린 칸 수다.
 * 세로 움직임이 없으면(가로 쓸기, Shift+휠) 칸이 아니다. 줄·쪽 단위는 이벤트 하나가 한 칸이다.
 * wheelDeltaY가 120의 배수이면 마우스 휠의 칸이다(Windows 마우스의 deltaY가 100이든 125든 한 칸에 한 번).
 * 그 밖의 픽셀 단위는 쌓아서 PIXELS_PER_STEP마다 한 칸으로 세어, 트랙패드 쓸기 한 번에 끝까지 가지 않게 한다.
 * 방향: OS의 스크롤 방향 설정과 관계없이 손가락·휠의 실제 방향을 따른다(PM 결정 P6). 실제로 위로 굴리면 양수다.
 */
export class WheelSteps {
  #pixels = 0;

  steps(event: WheelLike): number {
    // 실제 방향의 deltaY. 위로 굴리면 음수다.
    const deltaY = event.invertedFromDevice === true ? -event.deltaY : event.deltaY;
    if (deltaY === 0)
      return 0;
    const up = deltaY < 0;
    if (event.deltaMode !== 0) {
      this.#pixels = 0;
      return up ? 1 : -1;
    }
    const legacy = Math.abs(event.wheelDeltaY ?? 0);
    if (legacy !== 0 && legacy % WHEEL_NOTCH === 0) {
      this.#pixels = 0;
      const notches = legacy / WHEEL_NOTCH;
      return up ? notches : -notches;
    }
    if (Math.sign(deltaY) !== Math.sign(this.#pixels))
      this.#pixels = 0;
    this.#pixels += deltaY;
    const whole = Math.trunc(this.#pixels / PIXELS_PER_STEP);
    this.#pixels -= whole * PIXELS_PER_STEP;
    return whole === 0 ? 0 : -whole;
  }
}
