<script lang="ts">
  import { MAX_TRANSPARENCY_PERCENT } from '../../domain/opacity.ts';
  import { WheelSteps } from '../input/wheel-steps.ts';

  let { label, percent, onchange, onwheelstep }: { label: string; percent: number; onchange: (percent: number) => void; onwheelstep: (up: boolean) => void } = $props();

  const wheel = new WheelSteps();

  /**
   * 휠 한 칸에 2%. 메뉴가 스크롤되지 않게 기본 동작을 막는다 (WND-12). passive가 아니어야 막을 수 있다.
   * WebKit(macOS)은 "자연스러운 스크롤"이면 deltaY를 뒤집고 webkitDirectionInvertedFromDevice로 알려 준다. 그 값으로 실제 방향을 되찾는다.
   * WebView2(Windows)에는 이 값이 없고, 휠 방향을 뒤집지도 않는다.
   */
  function wheelStep(node: HTMLElement): { destroy: () => void } {
    const handler = (event: WheelEvent): void => {
      event.preventDefault();
      const inverted = (event as WheelEvent & { webkitDirectionInvertedFromDevice?: boolean }).webkitDirectionInvertedFromDevice === true;
      const legacy = (event as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
      const steps = wheel.steps({ deltaY: event.deltaY, deltaMode: event.deltaMode, invertedFromDevice: inverted, wheelDeltaY: legacy });
      for (let i = 0; i < Math.abs(steps); i++)
        onwheelstep(steps > 0);
    };
    node.addEventListener('wheel', handler, { passive: false });
    return { destroy: () => node.removeEventListener('wheel', handler) };
  }
</script>

<div class="inner">
  <div class="top">
    <span>{label}</span>
    <span class="pct">{percent}%</span>
  </div>
  <input
    class="slider"
    type="range"
    min="0"
    max={MAX_TRANSPARENCY_PERCENT}
    step="1"
    value={percent}
    aria-label={label}
    style:--fill="{(percent / MAX_TRANSPARENCY_PERCENT) * 100}%"
    oninput={(event) => onchange(Number(event.currentTarget.value))}
    use:wheelStep
  />
</div>

<style>
  .inner {
    width: 170px;
    margin-left: 22px;
  }

  .top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .pct {
    font-size: 12.5px;
    color: var(--muted);
  }

  .slider {
    -webkit-appearance: none;
    appearance: none;
    display: block;
    width: 100%;
    height: 20px;
    margin: 6px 0 0;
    background: transparent;
    cursor: pointer;
  }

  .slider:focus {
    outline: none;
  }

  .slider::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(to right, var(--accent) var(--fill), var(--line) var(--fill));
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -5px;
    border: 2px solid var(--accent);
    border-radius: 50%;
    background: #fff;
  }

  .slider:hover::-webkit-slider-thumb {
    background: rgb(var(--doingbg));
  }
</style>
