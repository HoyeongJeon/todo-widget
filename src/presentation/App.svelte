<script lang="ts">
  // 계획 2의 위험 확인용 시험 화면이다. 실제 위젯 화면은 계획 5에서 만든다.
  import type { ResizeEdge, WindowControlsPort } from './window-controls.ts';

  let { controls, startedAt }: { controls: WindowControlsPort; startedAt: number } = $props();

  let items = $state<string[]>([]);
  let text = $state('');
  let pinned = $state(true);
  let transparency = $state(0);

  $effect(() => {
    void controls.ready(performance.now() - startedAt);
  });

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.isComposing)
      return;
    const title = text.trim();
    if (title.length === 0)
      return;
    items.push(title);
    text = '';
  }

  function togglePin(): void {
    pinned = !pinned;
    void controls.setPinned(pinned);
  }

  function resize(edge: ResizeEdge) {
    return (event: PointerEvent): void => {
      event.preventDefault();
      void controls.startResize(edge);
    };
  }
</script>

<main class="card" style:--card-alpha={1 - transparency / 100}>
  <header role="presentation" onpointerdown={() => void controls.startDragging()}>
    <h1>할 일 (시험 화면)</h1>
    <button onpointerdown={(e) => e.stopPropagation()} onclick={togglePin}>{pinned ? '📌 켬' : '📌 끔'}</button>
  </header>
  <ul>
    {#each items as item, index (index)}
      <li>{item}</li>
    {/each}
  </ul>
  <input bind:value={text} onkeydown={onKeydown} placeholder="할 일 추가" />
  <label>투명도 {transparency}% <input type="range" min="0" max="40" bind:value={transparency} /></label>
</main>
<div class="edge east" role="presentation" onpointerdown={resize('East')}></div>
<div class="edge south" role="presentation" onpointerdown={resize('South')}></div>
<div class="edge south-east" role="presentation" onpointerdown={resize('SouthEast')}></div>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    background: transparent;
    overflow: hidden;
  }

  .card {
    margin: 10px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(250, 248, 245, var(--card-alpha, 1));
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    font-family: system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: grab;
  }

  h1 {
    font-size: 15px;
    margin: 0 0 8px;
  }

  input:not([type]) {
    width: 100%;
    box-sizing: border-box;
  }

  .edge {
    position: fixed;
  }

  .east {
    top: 0;
    right: 0;
    width: 8px;
    height: 100%;
    cursor: ew-resize;
  }

  .south {
    left: 0;
    bottom: 0;
    width: 100%;
    height: 8px;
    cursor: ns-resize;
  }

  .south-east {
    right: 0;
    bottom: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
  }
</style>
