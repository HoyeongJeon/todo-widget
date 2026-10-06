<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export interface MenuItemEntry {
    kind: 'item';
    label: string;
    /** 체크 표시가 있을 수 있는 항목(자동 실행, 상태). */
    checkable?: boolean;
    checked?: boolean;
    disabled?: boolean;
    select: () => void;
  }

  export interface MenuSeparator {
    kind: 'separator';
  }

  /** 눌러도 메뉴가 닫히지 않고 방향키로 고르지 않는 줄(투명도). */
  export interface MenuControl {
    kind: 'control';
    content: Snippet;
  }

  export type MenuEntry = MenuItemEntry | MenuSeparator | MenuControl;
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import type { Position, Size } from '../menu/menu-placement.ts';
  import { moveHighlight } from '../menu/menu-navigation.ts';
  import Icon from './Icon.svelte';

  let { entries, place, onclose }: { entries: MenuEntry[]; place: (size: Size) => Promise<Position>; onclose: () => void } = $props();

  let element: HTMLDivElement | null = $state(null);
  let position = $state<Position | null>(null);
  let highlighted = $state<number | null>(null);

  const selectable = $derived(entries.map((entry) => entry.kind === 'item' && entry.disabled !== true));

  // 숨긴 채 그려 크기를 잰 뒤, 자리를 정해 보이고 키보드를 받게 포커스를 둔다 (WND-10, D6).
  $effect(() => {
    const el = element;
    if (!el)
      return;
    let cancelled = false;
    void untrack(() => place({ width: el.offsetWidth, height: el.offsetHeight })).then((next) => {
      if (cancelled)
        return;
      position = next;
      el.focus();
    });
    return () => {
      cancelled = true;
    };
  });

  function choose(entry: MenuEntry | undefined): void {
    if (entry?.kind !== 'item' || entry.disabled === true)
      return;
    entry.select();
  }

  function onKeydown(event: KeyboardEvent): void {
    // 투명도 슬라이더에 포커스가 있으면 방향키와 Space는 슬라이더가 쓴다. Esc는 그대로 메뉴를 닫는다 (리뷰 M11).
    // Enter도 메뉴가 받지 않는다. 받으면 전에 강조해 둔 항목(예: 종료)이 슬라이더에서 골라진다.
    if (event.target instanceof HTMLInputElement && event.key !== 'Escape')
      return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        highlighted = moveHighlight(selectable, highlighted, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        highlighted = moveHighlight(selectable, highlighted, -1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(highlighted === null ? undefined : entries[highlighted]);
        break;
      case 'Escape':
        event.preventDefault();
        onclose();
        break;
    }
  }
</script>

<div
  class="menu"
  role="menu"
  tabindex="-1"
  bind:this={element}
  style:left="{position?.left ?? 0}px"
  style:top="{position?.top ?? 0}px"
  style:visibility={position ? 'visible' : 'hidden'}
  onkeydown={onKeydown}
>
  {#each entries as entry, index (index)}
    {#if entry.kind === 'separator'}
      <div class="msep" role="separator"></div>
    {:else if entry.kind === 'control'}
      <div class="mctl">{@render entry.content()}</div>
    {:else}
      <button
        type="button"
        class="mi"
        class:hl={highlighted === index}
        class:disabled={entry.disabled === true}
        role={entry.checkable ? 'menuitemcheckbox' : 'menuitem'}
        aria-checked={entry.checkable ? entry.checked === true : undefined}
        aria-disabled={entry.disabled === true ? 'true' : undefined}
        tabindex="-1"
        onpointerenter={() => (highlighted = entry.disabled === true ? null : index)}
        onpointerleave={() => (highlighted = null)}
        onclick={() => choose(entry)}
      >
        <span class="chk">
          {#if entry.checked}
            <Icon name="check" size={12} />
          {/if}
        </span>
        {entry.label}
      </button>
    {/if}
  {/each}
</div>

<style>
  .menu {
    position: absolute;
    z-index: 5;
    min-width: 150px;
    padding: 5px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 3px 12px rgba(var(--shadow), 0.14);
    font-size: 13.5px;
    line-height: 18px;
    color: var(--ink);
    outline: none;
  }

  .mi {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    padding: 7px 10px 7px 8px;
    border-radius: 8px;
    white-space: nowrap;
    cursor: default;
  }

  .mi.hl {
    background: var(--hover);
  }

  .mi.disabled {
    opacity: 0.45;
  }

  .chk {
    flex: none;
    display: grid;
    align-items: center;
    width: 22px;
    color: var(--accent);
  }

  .msep {
    height: 1px;
    margin: 5px 8px;
    background: var(--line);
  }

  .mctl {
    padding: 7px 10px 6px 8px;
  }
</style>
