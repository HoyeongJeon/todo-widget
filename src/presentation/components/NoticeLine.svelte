<script lang="ts">
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';

  let { vm }: { vm: WidgetViewModel } = $props();
</script>

{#if vm.notice}
  <!-- 안내 하나. 글이 길면 줄을 바꾼다(두 줄 안에 들어가게 문구를 짧게 둔다, D18). -->
  <div class="notice" role="status">
    {#each vm.notice.messages as message, index (index)}
      {#if index > 0}<span class="sep">·</span>{/if}{message}
    {/each}
    {#if vm.notice.action}
      <span class="sep">·</span><button type="button" class="action" onclick={() => vm.installUpdate()}>{vm.notice.action}</button>
    {/if}
  </div>
{/if}

<style>
  .notice {
    margin-top: 8px;
    font-size: 12.5px;
    line-height: 17px;
    color: var(--accent);
    overflow-wrap: anywhere;
  }

  .sep {
    margin: 0 3px;
    color: var(--hint);
  }

  .action {
    all: unset;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }

  .action:hover {
    color: var(--accent-hover);
  }
</style>
