<script lang="ts">
  import { type Anchor, MENU_SHADOW, type Position, type Size, placeMoreMenu } from '../menu/menu-placement.ts';
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';
  import Menu, { type MenuEntry } from './Menu.svelte';
  import TransparencySlider from './TransparencySlider.svelte';

  let { vm, anchor }: { vm: WidgetViewModel; anchor: Anchor } = $props();

  /** WND-10 항목 순서. */
  const entries: MenuEntry[] = $derived([
    { kind: 'item', label: vm.t('menu.autoStart'), checkable: true, checked: vm.menu.autoStartChecked, select: () => void vm.menu.toggleAutoStart() },
    { kind: 'control', content: transparency },
    { kind: 'separator' },
    { kind: 'item', label: vm.t('menu.reset'), disabled: !vm.menu.resetEnabled, select: () => vm.menu.reset() },
    { kind: 'item', label: vm.t('menu.quit'), select: () => vm.menu.quit() },
  ]);

  /** ⋯ 버튼 아래(모자라면 위)에 오른쪽 끝을 맞추고, 창 밖으로 나가면 창을 늘린다 (WND-10). */
  async function place(size: Size): Promise<Position> {
    const token = vm.window.popupToken;
    const room = await vm.window.room();
    const position = placeMoreMenu(anchor, size, vm.window.baseHeight, room);
    await vm.window.fitPopup(token, { top: position.top, bottom: position.top + size.height }, MENU_SHADOW);
    return position;
  }
</script>

{#snippet transparency()}
  <TransparencySlider
    label={vm.t('menu.transparency')}
    percent={vm.menu.transparency}
    onchange={(percent) => vm.menu.setTransparency(percent)}
    onwheelstep={(up) => vm.menu.wheel(up)}
  />
{/snippet}

<Menu {entries} {place} onclose={() => vm.menu.close()} />
