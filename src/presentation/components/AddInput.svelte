<script lang="ts">
  import { hasLineBreak } from '../../domain/paste.ts';
  import { isCommitEnter } from '../input/enter-key.ts';
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';

  let { vm }: { vm: WidgetViewModel } = $props();

  let text = $state('');

  function onKeydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }): void {
    if (event.isComposing)
      return;
    if (event.key === 'Escape') {
      text = ''; // INPUT-04
      return;
    }
    if (!isCommitEnter(event))
      return;
    event.preventDefault();
    // 바인딩을 기다리지 않고 칸의 실제 글을 읽는다. IME가 마지막 글자를 막 확정했어도 빠지지 않는다 (INPUT-05).
    if (vm.add(event.currentTarget.value))
      text = ''; // INPUT-02. 추가하지 않았으면 그대로 둔다 (INPUT-03)
  }

  /** 여러 줄이면 막고 줄마다 바로 추가한다. 쓰던 글자는 그대로 둔다 (INPUT-07). 한 줄은 OS 기본 붙여넣기 (INPUT-10). */
  function onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text/plain') ?? '';
    if (!hasLineBreak(pasted))
      return;
    event.preventDefault();
    vm.add(pasted);
  }
</script>

<div class="adder">
  <span class="plus" aria-hidden="true">+</span>
  <input
    class="field"
    type="text"
    bind:value={text}
    placeholder={vm.t('input.placeholder')}
    aria-label={vm.t('input.placeholder')}
    spellcheck="false"
    autocomplete="off"
    onkeydown={onKeydown}
    onpaste={onPaste}
  />
</div>

<style>
  .adder {
    display: flex;
    align-items: center;
    border-top: 1px solid var(--line);
    margin-top: 12px;
    padding-top: 10px;
  }

  .plus {
    font-size: 16px;
    line-height: 20px;
    color: var(--hint);
    margin: 0 10px 0 2px;
  }

  .field {
    flex: 1;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    font-size: 14.5px;
    line-height: 20px;
    color: var(--ink);
    caret-color: var(--ink);
  }

  .field::placeholder {
    color: var(--hint);
    opacity: 1;
  }
</style>
