<script lang="ts">
  import { untrack } from 'svelte';
  import { type ListHeights, type SectionMeasure, sameListHeights, sectionListHeights } from '../layout/section-heights.ts';
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';
  import Icon from './Icon.svelte';
  import TaskRow from './TaskRow.svelte';

  let { vm, available }: { vm: WidgetViewModel; available: number } = $props();

  let doneSection: HTMLElement | null = $state(null);
  let doneScroll: HTMLElement | null = $state(null);
  let doneRows: HTMLElement | null = $state(null);
  let todoSection: HTMLElement | null = $state(null);
  let todoScroll: HTMLElement | null = $state(null);
  let todoRows: HTMLElement | null = $state(null);
  let heights = $state<ListHeights>({ done: null, todo: null });

  /** 섹션 하나를 잰다. 목록 상자는 지금 최대 높이로 줄어 있을 수 있어, 목록 말고의 높이(chrome)는 상자 높이를 빼서 구한다. */
  function measure(section: HTMLElement | null, scroll: HTMLElement | null, rows: HTMLElement | null): SectionMeasure | null {
    if (!section)
      return null;
    const marginTop = Number.parseFloat(getComputedStyle(section).marginTop) || 0;
    const first = rows?.firstElementChild;
    return {
      chrome: section.offsetHeight + marginTop - (scroll?.offsetHeight ?? 0),
      content: rows?.offsetHeight ?? 0,
      firstRow: first ? first.getBoundingClientRect().height + 2 : 0,
      expanded: scroll !== null,
    };
  }

  /** 쓸 수 있는 높이를 섹션에 나눈다 (LIST-13~15). 섹션은 각자 스크롤한다 (LIST-16). */
  function relayout(): void {
    const next = sectionListHeights(available, {
      done: measure(doneSection, doneScroll, doneRows),
      todo: measure(todoSection, todoScroll, todoRows),
    });
    if (!sameListHeights(next, heights))
      heights = next;
  }

  // 쓸 수 있는 높이, 목록, 접힘이 바뀌면 다시 나눈다. DOM이 바뀐 뒤에 돈다.
  $effect(() => {
    void available;
    void vm.doneItems;
    void vm.todoItems;
    void doneScroll;
    void todoScroll;
    untrack(relayout);
  });

  // 긴 제목이 줄을 바꾸거나 이름 바꾸기 칸이 커지면 줄 높이가 바뀐다.
  $effect(() => {
    const rows = [doneRows, todoRows].filter((el): el is HTMLElement => el !== null);
    if (rows.length === 0)
      return;
    const observer = new ResizeObserver(() => untrack(relayout));
    for (const el of rows)
      observer.observe(el);
    return () => observer.disconnect();
  });
</script>

{#if vm.isEmpty}
  <div class="empty">{vm.t('list.empty')}</div>
{/if}
{#if vm.sections.includes('done')}
  <section class="done-sec" bind:this={doneSection}>
    <button type="button" class="fold" aria-expanded={vm.doneExpanded} onclick={() => vm.toggleDone()}>
      <span class="dot green"></span>
      <span class="label">{vm.t('status.done')}</span>
      <span class="count">{vm.doneItems.length}</span>
      <span class="right">{vm.doneToggleText}</span>
    </button>
    {#if vm.doneExpanded}
      <div class="scroll list" bind:this={doneScroll} style:max-height={heights.done === null ? null : `${heights.done}px`}>
        <div class="rows" bind:this={doneRows}>
          {#each vm.doneItems as item (item.id)}
            <TaskRow {vm} {item} />
          {/each}
        </div>
      </div>
    {/if}
  </section>
{/if}
{#if vm.sections.includes('todo')}
  <section class="todo-sec" bind:this={todoSection}>
    <button type="button" class="sechead" aria-expanded={vm.todoExpanded} onclick={() => vm.toggleTodo()}>
      <span class="dot orange"></span>
      <span class="label">{vm.t('status.todo')}</span>
      <span class="count">{vm.todoItems.length}</span>
      <span class="right"><Icon name={vm.todoExpanded ? 'down' : 'right'} size={10} /></span>
    </button>
    {#if vm.todoExpanded}
      <div class="scroll list" bind:this={todoScroll} style:max-height={heights.todo === null ? null : `${heights.todo}px`}>
        <div class="rows" bind:this={todoRows}>
          {#each vm.todoItems as item (item.id)}
            <TaskRow {vm} {item} />
          {/each}
        </div>
      </div>
    {/if}
  </section>
{/if}

<style>
  .empty {
    margin: 14px 0 6px;
    text-align: center;
    font-size: 13.5px;
    line-height: 18px;
    color: var(--muted);
  }

  .done-sec {
    margin-top: 8px;
  }

  /* hover 배경 없음 (v1.4 M:148). 배경은 투명도를 따른다 (WND-13). */
  .fold {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 10px;
    border-radius: 10px;
    background: rgba(var(--foldbg), var(--a));
    font-size: 13px;
    line-height: 18px;
    color: var(--muted);
    cursor: pointer;
  }

  .done-sec .list {
    margin-top: 4px;
  }

  /* 줄 묶음도 flex로 쌓는다. 줄의 위아래 margin 1이 겹치거나 밖으로 빠지지 않아, 줄 사이가 v1.4처럼 2이고 높이를 정확히 잰다 (D16, 리뷰 I1). */
  .rows {
    display: flex;
    flex-direction: column;
  }

  /* v1.4 값 12 (PM 결정 P2). 제목 줄의 -3 margin이 상자를 끌어올려 끝낸 일 섹션과의 사이는 9로 보인다(시안과 같다). */
  .todo-sec {
    margin-top: 12px;
  }

  /*
   * 위 음수 여백을 안쪽 여백으로 상쇄해, 줄 높이 24는 그대로 두고 hover 배경만 위아래로 넓게 칠한다 (v1.4 T:127).
   * 좌우는 v1.4와 달리 10 안으로 넣어, 점과 글자가 끝낸 일 줄(안쪽 여백 10)·할 일 동그라미(줄 안쪽 여백 10)와 맞는다.
   * hover 배경은 할 일 줄 폭 그대로다 (PM 결정 2026-10-06).
   */
  .sechead {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    margin: -3px 0 3px;
    padding: 3px 10px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 18px;
    color: var(--muted);
    cursor: pointer;
  }

  .sechead:hover {
    background: var(--hover);
  }

  .dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .dot.green {
    background: var(--done);
  }

  .dot.orange {
    background: var(--accent);
  }

  .label {
    margin-left: 7px;
    font-weight: 600;
  }

  .count {
    margin-left: 5px;
  }

  .right {
    display: flex;
    align-items: center;
    margin-left: auto;
    padding-left: 8px;
    white-space: nowrap;
  }
</style>
