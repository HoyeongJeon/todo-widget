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

  /** Esc는 취소, ←·→는 취소와 모두 지우기 사이로 포커스를 옮기고, Enter는 포커스가 있는 버튼을 누른다 (INPUT-18). */
  function onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        vm.cancelReset();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        cancelButton?.focus({ preventScroll: true });
        break;
      case 'ArrowRight':
        event.preventDefault();
        confirmButton?.focus({ preventScroll: true });
        break;
      case 'Enter':
        // OS 기본 동작에 맡기지 않고 직접 누른다. 두 번 눌리지 않게 기본 동작은 막는다.
        if (event.target instanceof HTMLButtonElement) {
          event.preventDefault();
          event.target.click();
        }
        break;
    }
  }
</script>

<div class="overlay" role="presentation" bind:this={overlay} onclick={onOverlayClick} onkeydown={onKeydown}>
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

  .pill.danger {
    background: var(--danger);
    color: #fff;
    font-weight: 600;
  }

  .pill.danger:hover {
    background: var(--danger-hover);
  }
</style>
