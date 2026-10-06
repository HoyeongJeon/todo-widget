<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { SHADOW_MARGIN } from '../domain/window-geometry.ts';
  import AddInput from './components/AddInput.svelte';
  import ContextMenu from './components/ContextMenu.svelte';
  import Header from './components/Header.svelte';
  import MoreMenu from './components/MoreMenu.svelte';
  import NoticeLine from './components/NoticeLine.svelte';
  import ResetConfirm from './components/ResetConfirm.svelte';
  import ResizeEdges from './components/ResizeEdges.svelte';
  import TaskSections from './components/TaskSections.svelte';
  import { allowsNativeContextMenu } from './input/native-context-menu.ts';
  import type { Anchor } from './menu/menu-placement.ts';
  import type { WidgetViewModel } from './widget-view-model.svelte.ts';

  let { vm, startedAt }: { vm: WidgetViewModel; startedAt: number } = $props();

  let stage: HTMLElement | null = $state(null);
  let card: HTMLElement | null = $state(null);
  let body: HTMLElement | null = $state(null);
  /** 섹션들이 쓸 수 있는 높이. 카드 최대 높이에서 헤더·안내 줄·입력칸·안쪽 여백을 뺀다. */
  let available = $state(Number.POSITIVE_INFINITY);
  let moreAnchor = $state<Anchor | null>(null);

  /** 카드를 재서 섹션이 쓸 높이를 정하고(LIST-13~15), 창 높이로 쓸 값(카드 + 위아래 그림자 여백)을 돌려준다(WND-03). */
  function measureCard(): number {
    if (!card || !body)
      return 0;
    const cardHeight = card.getBoundingClientRect().height;
    const cap = vm.window.resizing ? window.innerHeight - 2 * SHADOW_MARGIN : vm.window.maxCardHeight;
    const next = cap - (cardHeight - body.getBoundingClientRect().height);
    if (!(Math.abs(next - available) <= 0.5))
      available = next;
    return Math.ceil(cardHeight) + 2 * SHADOW_MARGIN;
  }

  onMount(() => {
    // 숨긴 창에서는 ResizeObserver가 오지 않을 수 있다. 처음 크기는 바로 재서 창을 맞추고 보인다 (D19).
    void vm.window.showFirst(measureCard(), performance.now() - startedAt);
    const observer = new ResizeObserver(() => vm.window.contentResized(measureCard()));
    if (card)
      observer.observe(card);
    return () => {
      observer.disconnect();
      vm.dispose();
    };
  });

  // 끄기를 시작하거나 놓아 최대 높이가 바뀌면 다시 잰다 (WND-03).
  $effect(() => {
    void vm.window.resizing;
    void vm.window.maxCardHeight;
    untrack(() => vm.window.contentResized(measureCard()));
  });

  // 메뉴와 확인 판이 모두 닫히면 늘린 창을 되돌린다 (WND-10).
  $effect(() => {
    if (!vm.anyPopupOpen)
      untrack(() => void vm.window.clearPopup());
  });

  /** WebView 기본 메뉴(새로 고침 등)는 막는다. 글을 쓰는 칸(입력칸·이름 바꾸기 칸)에서만 OS 기본 메뉴(잘라내기·복사·붙여넣기)를 그대로 둔다 (D25). */
  function onWindowContextMenu(event: MouseEvent): void {
    if (allowsNativeContextMenu(event.target))
      return;
    event.preventDefault();
  }

  function openMore(button: HTMLElement): void {
    if (!stage)
      return;
    const box = stage.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    moreAnchor = { top: rect.top - box.top, bottom: rect.bottom - box.top, right: rect.right - box.left };
    void vm.openMoreMenu();
  }
</script>

<!-- 창이 포커스를 잃으면(macOS에서 늘린 투명 부분을 누르면 클릭이 뒤 앱으로 가서 이렇게 된다) 메뉴와 확인 판을 닫는다 (D10). -->
<svelte:window onblur={() => vm.closePopups()} oncontextmenu={onWindowContextMenu} />

<div class="frame" style:padding-top="{vm.window.lift}px">
  <div class="stage" bind:this={stage}>
    <div class="shell">
      <main
        class="card"
        class:fill={vm.window.resizing}
        style:--a={vm.menu.cardOpacity}
        style:max-height={vm.window.resizing ? null : `${vm.window.maxCardHeight}px`}
        bind:this={card}
      >
        <Header {vm} onmore={openMore} />
        <div class="body" bind:this={body}>
          <TaskSections {vm} {available} />
        </div>
        <NoticeLine {vm} />
        <AddInput {vm} />
        {#if vm.confirmingReset && stage}
          <ResetConfirm {vm} {stage} />
        {/if}
      </main>
      <ResizeEdges onresize={(edge, event) => void vm.startResize(edge, event)} />
    </div>
    {#if vm.menu.open || vm.contextMenu}
      <!-- 메뉴 바깥 클릭을 받아 닫는다(Windows처럼 투명 부분의 클릭이 창에 오는 경우, D10). -->
      <div class="backdrop" role="presentation" onpointerdown={() => vm.closePopups()}></div>
    {/if}
    {#if vm.menu.open && moreAnchor}
      <MoreMenu {vm} anchor={moreAnchor} />
    {/if}
    {#if vm.contextMenu && stage}
      <ContextMenu {vm} target={vm.contextMenu} {stage} />
    {/if}
  </div>
</div>

<style>
  .stage {
    position: relative;
  }

  /* 카드 둘레 투명 여백: 그림자와 크기 조절 가장자리 자리 (window.md 용어 "크기와 좌표"). */
  .shell {
    position: relative;
    padding: 10px;
  }

  /* 둥근 카드, 테두리 없음, 옅은 그림자 (WND-01). 배경과 그림자만 불투명도(--a)를 따른다 (WND-13). */
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 16px 18px 12px;
    border-radius: 18px;
    background: rgba(var(--card), var(--a));
    box-shadow: 0 3px 12px rgba(var(--shadow), calc(0.16 * var(--a)));
  }

  /* 끄는 동안 카드가 창을 채우고 입력칸은 아래에 붙는다 (WND-03, v1.4 MC:64-91). 그 밖에는 최대 높이 - 20이 상한이다(v1.4 MC:89). */
  .card.fill {
    height: calc(100vh - 20px);
  }

  /* 섹션을 flex로 쌓는다. margin이 겹치지 않아 v1.4 간격 그대로이고 높이를 정확히 잰다 (D16). */
  /* 카드가 최대 높이에 닿으면 섹션 영역이 줄고 넘친 부분은 잘린다. 헤더·안내 줄·입력칸은 줄지 않아 늘 보인다(v1.4 DockPanel, 리뷰 I3). */
  .body {
    display: flex;
    flex: 0 1 auto;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .card.fill .body {
    flex: 1 1 auto;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 4;
  }
</style>
