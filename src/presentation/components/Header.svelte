<script lang="ts">
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';
  import Icon from './Icon.svelte';

  let { vm, onmore }: { vm: WidgetViewModel; onmore: (button: HTMLElement) => void } = $props();

  /**
   * 버튼이 아닌 헤더를 왼쪽 버튼으로 누르면 OS 기본 끌기로 창을 옮긴다 (WND-02, 계획 2에서 넘긴 일).
   * macOS Control+클릭은 우클릭이므로 끌지 않는다 (INPUT-12).
   */
  function onPointerDown(event: PointerEvent): void {
    if (event.button === 0 && !event.ctrlKey)
      vm.window.startMove();
  }

  /** 버튼을 누른 것은 끌기가 아니다. */
  function stop(event: PointerEvent): void {
    event.stopPropagation();
  }

  /** 버튼은 포커스를 가져가지 않는다. Chromium(WebView2)은 누를 때 버튼에 포커스를 줘, 입력칸에 쓰던 키가 버튼으로 간다 (WND-09, WND-10). */
  function keepFocus(event: MouseEvent): void {
    event.preventDefault();
  }
</script>

<header class="header" role="presentation" onpointerdown={onPointerDown}>
  <div class="titles">
    <div class="title">{vm.t('app.title')}</div>
    <div class="remaining">{vm.remainingText}</div>
  </div>
  <button
    type="button"
    class="iconbtn"
    class:pin-on={vm.pinned}
    class:pin-off={!vm.pinned}
    title={vm.pinTooltip}
    aria-label={vm.pinTooltip}
    aria-pressed={vm.pinned}
    onpointerdown={stop}
    onmousedown={keepFocus}
    onclick={() => void vm.togglePin()}
  >
    <Icon name={vm.pinned ? 'pin' : 'unpin'} size={15} />
  </button>
  <button
    type="button"
    class="iconbtn"
    class:active={vm.menu.open}
    title={vm.t('menu.more')}
    aria-label={vm.t('menu.more')}
    aria-haspopup="menu"
    onpointerdown={stop}
    onmousedown={keepFocus}
    onclick={(event) => onmore(event.currentTarget)}
  >
    <Icon name="more" size={15} />
  </button>
</header>

<style>
  .header {
    display: flex;
    align-items: flex-start;
    margin-bottom: 4px;
  }

  .titles {
    flex: 1;
    min-width: 0;
  }

  .title {
    font-size: 16px;
    font-weight: 700;
    line-height: 21px;
  }

  .remaining {
    margin-top: 2px;
    font-size: 12.5px;
    line-height: 17px;
    color: var(--muted);
  }

  .iconbtn {
    all: unset;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    color: var(--muted);
    cursor: pointer;
  }

  .iconbtn:hover,
  .iconbtn.active {
    background: var(--hover);
  }

  .iconbtn.pin-on {
    color: var(--ink);
  }

  .iconbtn.pin-off {
    color: var(--hint);
  }
</style>
