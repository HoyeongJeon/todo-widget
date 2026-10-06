<script lang="ts">
  import { hasLineBreak } from '../../domain/paste.ts';
  import type { TodoItem } from '../../domain/todo-item.ts';
  import { CompositionTracker } from '../input/composition-escape.ts';
  import { isCommitEnter } from '../input/enter-key.ts';
  import { insertText, joinLines } from '../input/rename-paste.ts';
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';

  let { vm, item }: { vm: WidgetViewModel; item: TodoItem } = $props();

  const editing = $derived(vm.renaming?.id === item.id);
  const composition = new CompositionTracker();

  /** 칸 높이를 내용에 맞춘다. 긴 제목도 칸 안에서 줄을 바꿔 전부 보인다 (LIST-11, D17). */
  function fitHeight(node: HTMLTextAreaElement): void {
    node.style.height = '0px';
    node.style.height = `${node.scrollHeight}px`;
  }

  /** 칸이 열리면 포커스를 받고 글자 전체를 고른다 (INPUT-13). */
  function startEditing(node: HTMLTextAreaElement): void {
    composition.reset();
    fitHeight(node);
    node.focus();
    node.select();
  }

  function onKeydown(event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }): void {
    // 조합을 끝내는 키는 isComposing이 false여도 keyCode 229로 올 수 있다(WebKit). Esc로 쓰던 글을 잃지 않게 거른다 (INPUT-05, D3).
    if (event.isComposing || event.keyCode === 229)
      return;
    if (event.key === 'Escape') {
      // 조합 중 Esc는 조합만 끝낸다(OS 관례). macOS WebKit은 그 Esc를 compositionend 바로 뒤에 keyCode 27로 보낸다 (INPUT-15).
      if (composition.isEscape(event))
        return;
      event.preventDefault();
      vm.cancelRename(); // INPUT-15
      return;
    }
    if (isCommitEnter(event)) {
      event.preventDefault();
      vm.commitRename(event.currentTarget.value); // INPUT-14
    }
  }

  /** Enter가 칸에 줄바꿈을 넣지 않게 한다. IME 조합 입력은 그대로 둔다 (D3). */
  function onBeforeInput(event: InputEvent): void {
    if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph')
      event.preventDefault();
  }

  function onInput(event: Event & { currentTarget: HTMLTextAreaElement }): void {
    fitHeight(event.currentTarget);
    vm.updateDraft(event.currentTarget.value);
  }

  /** 여러 줄은 줄바꿈을 공백으로 바꿔 커서 자리에 넣고 커서를 그 뒤에 둔다. 한 줄은 OS 기본 붙여넣기 (INPUT-16). */
  function onPaste(event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }): void {
    const pasted = event.clipboardData?.getData('text/plain') ?? '';
    if (!hasLineBreak(pasted))
      return;
    event.preventDefault();
    const field = event.currentTarget;
    const next = insertText(field.value, field.selectionStart, field.selectionEnd, joinLines(pasted));
    field.value = next.value;
    field.setSelectionRange(next.caret, next.caret);
    fitHeight(field);
    vm.updateDraft(next.value);
  }

  /** 이름 바꾸기 중에는 할 일 메뉴 대신 OS 기본 메뉴(잘라내기·복사·붙여넣기)를 둔다 (D25, v1.4 TextBox). */
  function onContextMenu(event: MouseEvent): void {
    if (editing)
      return;
    event.preventDefault();
    vm.openContextMenu(item.id, event.clientX, event.clientY);
  }
</script>

<div class="row" class:doing={item.status === 'doing'} class:done={item.status === 'done'} role="presentation" oncontextmenu={onContextMenu}>
  <!-- 동그라미는 포커스를 가져가지 않는다. 이름 바꾸기 칸이 열려 있으면 vm.cycle이 먼저 저장한다 (INPUT-11). -->
  <button
    type="button"
    class="mark"
    tabindex="-1"
    title={vm.t('item.changeStatus')}
    aria-label={vm.t('item.changeStatus')}
    onmousedown={(event) => event.preventDefault()}
    onclick={() => vm.cycle(item.id)}
  >
    <span class="ring"></span>
    <span class="core"></span>
  </button>
  {#if editing}
    <textarea
      class="text editing"
      rows="1"
      spellcheck="false"
      value={vm.renaming?.draft ?? item.title}
      use:startEditing
      onkeydown={onKeydown}
      oncompositionstart={() => composition.start()}
      oncompositionend={(event) => composition.end(event.timeStamp)}
      onbeforeinput={onBeforeInput}
      oninput={onInput}
      onpaste={onPaste}
      onblur={(event) => vm.commitRename(event.currentTarget.value)}
    ></textarea>
  {:else}
    <span class="text" role="presentation" ondblclick={() => vm.startRename(item.id)}>{item.title}</span>
  {/if}
</div>

<style>
  .row {
    display: flex;
    align-items: flex-start;
    padding: 8px 10px;
    margin: 1px 0;
    border-radius: 10px;
  }

  .row.doing {
    background: rgba(var(--doingbg), var(--a));
  }

  .mark {
    all: unset;
    flex: none;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    margin: 1px 10px 0 0;
    cursor: pointer;
  }

  .ring {
    grid-area: 1 / 1;
    width: 16px;
    height: 16px;
    border: 2px solid var(--todo);
    border-radius: 50%;
  }

  .mark:hover .ring {
    opacity: 0.7;
  }

  .core {
    grid-area: 1 / 1;
    display: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
  }

  .row.doing .ring {
    border-color: var(--accent);
  }

  .row.doing .core {
    display: block;
  }

  .row.done .ring {
    border-color: var(--done);
    background: var(--done);
  }

  .text {
    flex: 1;
    min-width: 0;
    font-size: 14.5px;
    line-height: 20px;
    overflow-wrap: anywhere;
  }

  .row.done .text {
    color: var(--muted);
    text-decoration: line-through;
  }

  /* v1.4처럼 칸 테두리·배경 없이 커서와 선택 영역만 보인다. */
  .text.editing {
    display: block;
    margin: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    resize: none;
    overflow: hidden;
    font: inherit;
    font-size: 14.5px;
    line-height: 20px;
    color: var(--ink);
    caret-color: var(--ink);
    text-decoration: none;
  }

  /* 끝낸 일의 칸도 v1.4처럼 진한 글자에 취소선이 없다. `.row.done .text`보다 세게 쓴다. */
  .row.done .text.editing {
    color: var(--ink);
    text-decoration: none;
  }
</style>
