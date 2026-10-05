<script lang="ts">
  // 시험 화면이다. 실제 위젯 화면(ViewModel, 4개 언어 사전)은 계획 5에서 만든다. 이 화면의 문구는 그때 사전으로 옮긴다.
  import type { RunningApp } from '../application/launch.ts';
  import { pickNotice } from '../application/notices.ts';
  import type { WindowController } from '../application/ports/window-controller.ts';
  import type { ResizeEdge } from '../domain/resize.ts';

  let { app, windowController, startedAt }: { app: RunningApp; windowController: WindowController; startedAt: number } = $props();

  /** 서비스가 바뀌었다고 알릴 때마다 올려서 다시 그린다. */
  let revision = $state(0);
  let text = $state('');
  /** 저장된 값에서 시작하고, 📌을 누르면 그 자리에서 덮어쓴다(쓸 수 있는 $derived). */
  let pinned = $derived(app.settings.current.pinned);
  let autoStartOn = $state(false);
  let transparency = $state(0);

  /** 누르고 잊는 호출이 거부되어도 처리하지 않은 거부로 남기지 않는다. 원인은 개발자 도구에서 본다. */
  function logFailure(what: string) {
    return (error: unknown): void => {
      console.error(what, error);
    };
  }

  $effect(() => {
    const bump = () => revision++;
    const stops = [app.session.onChange(bump), app.updates.onChange(bump), app.autoStart.onChange(bump)];
    windowController.show(performance.now() - startedAt).catch(logFailure('창을 보이지 못했어요'));
    void app.autoStart.isEnabled().then((on) => (autoStartOn = on));
    return () => stops.forEach((stop) => stop());
  });

  // 서비스는 Svelte 상태가 아니므로 revision을 읽어 다시 계산하게 한다.
  const items = $derived.by(() => {
    void revision;
    return app.session.items;
  });
  const notice = $derived.by(() => {
    void revision;
    return pickNotice({
      saveFailed: app.session.saveFailed,
      fileProblem: app.session.fileProblem,
      autoStartFailed: app.autoStart.failed,
      update: app.updates.state,
    });
  });

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.isComposing)
      return;
    if (app.session.add(text))
      text = '';
  }

  function onHeaderPointerDown(event: PointerEvent): void {
    if (event.button === 0)
      windowController.startDragging().catch(logFailure('창을 옮기지 못했어요'));
  }

  function togglePin(): void {
    pinned = !pinned;
    app.placement.setPinned(pinned).catch(logFailure('맨 위 고정을 바꾸지 못했어요'));
  }

  async function toggleAutoStart(): Promise<void> {
    try {
      autoStartOn = await app.autoStart.toggle();
    } catch (error) {
      logFailure('자동 실행을 바꾸지 못했어요')(error);
    }
  }

  function installUpdate(): void {
    app.updates.install().catch(logFailure('업데이트를 설치하지 못했어요'));
  }

  function quit(): void {
    app.lifecycle.quit().catch(logFailure('종료하지 못했어요'));
  }

  function resize(edge: ResizeEdge) {
    return (event: PointerEvent): void => {
      event.preventDefault();
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      app.placement.resize(edge, event).catch(logFailure('크기를 바꾸지 못했어요'));
    };
  }
</script>

<main class="card" style:--card-alpha={1 - transparency / 100}>
  <header role="presentation" onpointerdown={onHeaderPointerDown}>
    <h1>할 일 (시험 화면)</h1>
    <button onpointerdown={(e) => e.stopPropagation()} onclick={togglePin}>{pinned ? '📌 켬' : '📌 끔'}</button>
  </header>
  <ul>
    {#each items as item (item.id)}
      <li><button class="item" onclick={() => app.session.cycle(item.id)}>[{item.status}] {item.title}</button></li>
    {/each}
  </ul>
  {#if notice}
    <p class="notice">
      {notice.messages.join(' · ')}
      {#if notice.action}<button onclick={installUpdate}>update.action</button>{/if}
    </p>
  {/if}
  <input bind:value={text} onkeydown={onKeydown} placeholder="할 일 추가" />
  <label>투명도 {transparency}% <input type="range" min="0" max="40" bind:value={transparency} /></label>
  <footer>
    <button onclick={() => void toggleAutoStart()}>자동 실행: {autoStartOn ? '켬' : '끔'}</button>
    <button onclick={quit}>종료</button>
  </footer>
</main>
<div class="edge east" role="presentation" onpointerdown={resize('East')}></div>
<div class="edge south" role="presentation" onpointerdown={resize('South')}></div>
<div class="edge south-east" role="presentation" onpointerdown={resize('SouthEast')}></div>
<div class="edge north" role="presentation" onpointerdown={resize('North')}></div>
<div class="edge west" role="presentation" onpointerdown={resize('West')}></div>
<div class="edge north-east" role="presentation" onpointerdown={resize('NorthEast')}></div>
<div class="edge north-west" role="presentation" onpointerdown={resize('NorthWest')}></div>
<div class="edge south-west" role="presentation" onpointerdown={resize('SouthWest')}></div>

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

  .item {
    all: unset;
    cursor: pointer;
  }

  .notice {
    font-size: 12px;
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

  .north {
    top: 0;
    left: 0;
    width: 100%;
    height: 8px;
    cursor: ns-resize;
  }

  .west {
    top: 0;
    left: 0;
    width: 8px;
    height: 100%;
    cursor: ew-resize;
  }

  .north-east {
    top: 0;
    right: 0;
    width: 14px;
    height: 14px;
    cursor: nesw-resize;
  }

  .north-west {
    top: 0;
    left: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
  }

  .south-west {
    bottom: 0;
    left: 0;
    width: 14px;
    height: 14px;
    cursor: nesw-resize;
  }
</style>
