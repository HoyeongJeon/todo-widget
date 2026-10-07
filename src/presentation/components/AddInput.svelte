<script lang="ts">
  import { hasLineBreak } from '../../domain/paste.ts';
  import { CompositionTracker } from '../input/composition-escape.ts';
  import { isCommitEnter } from '../input/enter-key.ts';
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';

  let { vm }: { vm: WidgetViewModel } = $props();

  let text = $state('');
  const composition = new CompositionTracker();

  function onKeydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }): void {
    // 모든 keydown이 지나간다. 조합을 끝내기만 하는 Esc인지 정하고 입력기 편집 표시를 지운다 (composition-escape.ts).
    const imeEscape = composition.keydown(event);
    // 조합을 끝내는 키는 isComposing이 false여도 keyCode 229로 올 수 있다(WebKit). Esc로 쓰던 글을 잃지 않게 거른다 (INPUT-05, D3).
    if (event.isComposing || event.keyCode === 229)
      return;
    if (event.key === 'Escape') {
      // 조합 중 Esc는 조합만 끝낸다(OS 관례). macOS WKWebView 한글은 입력기가 글자를 확정한 뒤, WebView2 한글은 compositionend 뒤에
      // 그 Esc를 keyCode 27로 보낸다 (INPUT-04).
      if (!imeEscape)
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
    data-focus-home
    bind:value={text}
    placeholder={vm.t('input.placeholder')}
    aria-label={vm.t('input.placeholder')}
    spellcheck="false"
    autocomplete="off"
    onkeydown={onKeydown}
    onkeyup={() => composition.keyup()}
    oncompositionstart={() => composition.start()}
    oncompositionend={() => composition.end()}
    onbeforeinput={(event) => composition.input(event.inputType)}
    onblur={() => composition.reset()}
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
