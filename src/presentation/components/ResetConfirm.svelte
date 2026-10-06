<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { SHADOW_MARGIN } from '../../domain/window-geometry.ts';
  import { rememberFocus } from '../menu/focus-return.ts';
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';

  let { vm, stage }: { vm: WidgetViewModel; stage: HTMLElement } = $props();

  let overlay: HTMLDivElement | null = $state(null);
  let cancelButton: HTMLButtonElement | null = $state(null);
  let confirmButton: HTMLButtonElement | null = $state(null);

  // 열리면 취소 버튼이 포커스를 받는다. 판 뒤 입력칸의 Enter가 할 일을 더하지 않게 한다. 닫히면 열기 전 포커스로 돌아간다 (리뷰 M9).
  const restoreFocus = rememberFocus();
  onMount(() => {
    cancelButton?.focus({ preventScroll: true });
    return () => restoreFocus(overlay);
  });

  // 판이 카드보다 크면 덮개가 판만큼 커진다. 그때는 창을 늘려 판이 잘리지 않게 한다 (WND-10).
  $effect(() => {
    const el = overlay;
    if (!el)
      return;
    const box = stage.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    untrack(() => void vm.window.fitPopup(vm.window.popupToken, { top: rect.top - box.top, bottom: rect.bottom - box.top }, { top: 0, bottom: SHADOW_MARGIN }));
  });

  /** 판 바깥(옅게 덮인 부분)을 누르면 취소다 (INPUT-18). */
  function onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget)
      vm.cancelReset();
  }

  /**
   * 판이 열린 동안의 키는 창 전체에서(capture) 받아 판이 처리한다. 포커스가 판 밖(입력칸 등)에 있어도 같다 (INPUT-18).
   * Esc는 취소, ←는 취소·→는 모두 지우기로 포커스를 옮기고, Enter는 포커스가 있는 버튼을 누른다. 포커스가 두 버튼 밖이면 취소를 누른다.
   * 처리한 키는 기본 동작과 전달을 막는다. 판 뒤 입력칸의 Enter가 할 일을 더하거나, 버튼 기본 동작으로 두 번 눌리지 않는다.
   */
  function onWindowKeydown(event: KeyboardEvent): void {
    if (event.isComposing || event.keyCode === 229)
      return;
    const focused = document.activeElement === confirmButton ? confirmButton : document.activeElement === cancelButton ? cancelButton : null;
    switch (event.key) {
      case 'Escape':
        vm.cancelReset();
        break;
      case 'ArrowLeft':
        cancelButton?.focus({ preventScroll: true });
        break;
      case 'ArrowRight':
        confirmButton?.focus({ preventScroll: true });
        break;
      case 'Enter':
        (focused ?? cancelButton)?.click();
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }
</script>

<svelte:window onkeydowncapture={onWindowKeydown} />

<div class="overlay" role="presentation" bind:this={overlay} onclick={onOverlayClick}>
  <div class="confirm" role="dialog" aria-modal="true" aria-labelledby="reset-question">
    <div class="q" id="reset-question">{vm.resetQuestion}</div>
    <div class="w">{vm.t('reset.warning')}</div>
    <div class="btns">
      <button type="button" class="pill" bind:this={cancelButton} onclick={() => vm.cancelReset()}>{vm.t('reset.cancel')}</button>
      <button type="button" class="pill danger" bind:this={confirmButton} onclick={() => vm.confirmReset()}>{vm.t('reset.confirm')}</button>
    </div>
  </div>
</div>

<style>
  /* 카드 전체를 덮는다. 판이 카드보다 크면 판만큼 커진다. 덮개는 투명도와 관계없이 흰색 70%다(v1.4 M:188). */
  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 6;
    display: flex;
    align-items: center;
    min-height: 100%;
    padding: 12px 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.7);
  }

  .confirm {
    width: 100%;
    padding: 14px 14px 14px 16px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 3px 14px rgba(var(--shadow), 0.16);
  }

  .q {
    font-size: 14px;
    font-weight: 600;
    line-height: 19px;
  }

  .w {
    margin-top: 4px;
    font-size: 12.5px;
    line-height: 17px;
    color: var(--muted);
  }

  .btns {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 14px;
  }

  .pill {
    padding: 7px 14px;
    border: 0;
    border-radius: 9px;
    background: rgb(var(--foldbg));
    font: inherit;
    font-size: 13px;
    line-height: 18px;
    color: var(--ink);
    cursor: pointer;
  }

  .pill:hover {
    background: var(--hover);
  }

  /*
   * 포커스가 있는 버튼을 늘 보인다(INPUT-18 ←·→). WebKit 기본 포커스 표시는 :focus-visible 규칙을 따라,
   * 마우스로 판을 연 뒤 스크립트가 옮긴 포커스에는 고리를 그리지 않다가 키를 한 번 더 누른 뒤에야 그린다.
   */
  .pill:focus {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .pill.danger {
    background: var(--danger);
    color: #fff;
    font-weight: 600;
  }

  .pill.danger:hover {
    background: var(--danger-hover);
  }
</style>
