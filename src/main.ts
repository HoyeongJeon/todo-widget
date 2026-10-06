import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { mount } from 'svelte';
import { createSystemClock } from './adapters/system/clock.ts';
import { createIdGenerator } from './adapters/system/ids.ts';
import { createSystemTimer } from './adapters/system/timer.ts';
import { watchWake } from './adapters/system/wake.ts';
import { loadPlatformInfo } from './adapters/tauri/app-info.ts';
import { createTauriAutoStart } from './adapters/tauri/auto-start.ts';
import { tauriDialog } from './adapters/tauri/dialog.ts';
import { createTauriFileStore } from './adapters/tauri/file-store.ts';
import { createLocaleProvider } from './adapters/tauri/locale.ts';
import { createTauriProcess } from './adapters/tauri/process.ts';
import { setTrayLabels } from './adapters/tauri/tray.ts';
import { createWindowController, tauriWindowApi } from './adapters/tauri/window-controller.ts';
import { createTauriUpdater, tauriUpdaterApi } from './adapters/updater/tauri-updater.ts';
import { screenLanguage } from './application/language.ts';
import { launchApp } from './application/launch.ts';
import App from './presentation/App.svelte';
import { createTranslator } from './presentation/i18n/translator.ts';
import { fontStack } from './presentation/theme/fonts.ts';
import './presentation/theme/theme.css';
import { WidgetViewModel } from './presentation/widget-view-model.svelte.ts';

/** composition root. adapter를 만들어 application에 넘기고, 실행되면 화면을 붙인다. 흐름은 launchApp이 정한다. */
async function main(): Promise<void> {
  const startedAt = performance.now();
  const target = document.getElementById('app');
  if (!target)
    throw new Error('#app 요소가 없어요');

  // 화면 언어는 켤 때 한 번 정한다 (I18N-01). 글꼴은 언어와 OS로 고른다 (I18N-06).
  const [platform, language] = await Promise.all([loadPlatformInfo(invoke), screenLanguage(createLocaleProvider(invoke))]);
  const t = createTranslator(language);
  document.documentElement.lang = language;
  document.documentElement.style.setProperty('--font-ui', fontStack(platform.os, language));
  // 메뉴 막대 메뉴 글 (MAC-04, I18N-02). 실패해도 위젯은 뜨고 메뉴는 영어 기본값으로 남는다.
  setTrayLabels(invoke, { open: t('tray.open'), quit: t('menu.quit') }).catch((error: unknown) => {
    console.error('메뉴 막대 문구를 바꾸지 못했어요', error);
  });

  const windowController = createWindowController({
    api: tauriWindowApi(),
    invoke,
    os: platform.os,
    pointer: window,
    requestFrame: (callback) => requestAnimationFrame(() => callback()),
  });

  const result = await launchApp({
    files: await createTauriFileStore(invoke),
    clock: createSystemClock(),
    timer: createSystemTimer(),
    newId: createIdGenerator(),
    autoStart: createTauriAutoStart(invoke),
    appInfo: { version: platform.version, isDevBuild: platform.isDevBuild },
    window: windowController,
    dialog: tauriDialog(),
    process: createTauriProcess(invoke, (event, handler) => listen(event, () => handler())),
    updater: createTauriUpdater(tauriUpdaterApi(), platform.version),
    watchWake: (onWake) => watchWake(onWake),
    // STORE-10 대화 상자 문구도 사전에서 꺼낸다 (I18N-02).
    texts: { appTitle: t('app.title'), cannotOpen: t('error.cannotOpen') },
  });

  if (result.kind === 'running')
    mount(App, { target, props: { vm: new WidgetViewModel({ app: result, t }), startedAt } });
}

main().catch((error: unknown) => {
  // 창이 숨은 채로 남지 않게 Rust 대비책(SHOW_FALLBACK_DELAY)이 창을 띄운다. 원인은 개발자 도구에서 본다.
  console.error('TodoWidget을 시작하지 못했어요', error);
});
