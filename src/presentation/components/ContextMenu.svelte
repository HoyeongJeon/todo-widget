<script lang="ts">
  import { MENU_SHADOW, type Position, type Size, placeContextMenu } from '../menu/menu-placement.ts';
  import type { ContextMenuState, WidgetViewModel } from '../widget-view-model.svelte.ts';
  import Menu, { type MenuEntry } from './Menu.svelte';

  let { vm, target, stage }: { vm: WidgetViewModel; target: ContextMenuState; stage: HTMLElement } = $props();

  /** INPUT-12 항목 순서. */
  const entries: MenuEntry[] = $derived([
    ...vm.statusChoices(target.itemId).map(
      (choice): MenuEntry => ({ kind: 'item', label: choice.label, checkable: true, checked: choice.checked, select: () => vm.setStatus(target.itemId, choice.status) }),
    ),
    { kind: 'separator' },
    { kind: 'item', label: vm.t('item.rename'), select: () => vm.startRename(target.itemId) },
    { kind: 'item', label: vm.t('item.delete'), select: () => vm.remove(target.itemId) },
  ]);

  /** 판 왼쪽 위가 커서 자리다. 창 밖으로 나가면 창을 늘린다 (D6, WND-10). */
  async function place(size: Size): Promise<Position> {
    const token = vm.window.popupToken;
    const box = stage.getBoundingClientRect();
    const room = await vm.window.room();
    const position = placeContextMenu({ x: target.x - box.left, y: target.y - box.top }, size, { width: box.width, height: vm.window.baseHeight }, room);
    await vm.window.fitPopup(token, { top: position.top, bottom: position.top + size.height }, MENU_SHADOW);
    return position;
  }
</script>

<Menu {entries} {place} onclose={() => vm.closeContextMenu()} />
