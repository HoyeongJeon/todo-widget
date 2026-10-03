<script lang="ts">
  // 계획 2의 위험 확인용 시험 화면이다. 실제 위젯 화면은 계획 5에서 만든다.
  let { onReady }: { onReady?: () => void } = $props();

  let items = $state<string[]>([]);
  let text = $state('');

  $effect(() => {
    onReady?.();
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
</script>

<main class="card">
  <h1>할 일 (시험 화면)</h1>
  <ul>
    {#each items as item, index (index)}
      <li>{item}</li>
    {/each}
  </ul>
  <input bind:value={text} onkeydown={onKeydown} placeholder="할 일 추가" />
</main>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    background: transparent;
  }

  .card {
    margin: 10px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(250, 248, 245, var(--card-alpha, 1));
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    font-family: system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  }

  h1 {
    font-size: 15px;
    margin: 0 0 8px;
  }

  input {
    width: 100%;
    box-sizing: border-box;
  }
</style>
