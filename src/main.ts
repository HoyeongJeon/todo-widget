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
import { createTauriProcess } from './adapters/tauri/process.ts';
import { createWindowController, tauriWindowApi } from './adapters/tauri/window-controller.ts';
import { createTauriUpdater, tauriUpdaterApi } from './adapters/updater/tauri-updater.ts';
import { launchApp } from './application/launch.ts';
import App from './presentation/App.svelte';

/** composition root. adapter를 만들어 application에 넘기고, 실행되면 화면을 붙인다. 흐름은 launchApp이 정한다. */
async function main(): Promise<void> {
  const startedAt = performance.now();
  const target = document.getElementById('app');
  if (!target)
    throw new Error('#app 요소가 없어요');

  const platform = await loadPlatformInfo(invoke);
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
    // 계획 5에서 I18N 사전(app.title, error.cannotOpen)으로 바꾼다.
    texts: { appTitle: '할 일', cannotOpen: '할 일 파일을 열 수 없어요' },
  });

  if (result.kind === 'running')
    mount(App, { target, props: { app: result, windowController, startedAt } });
}

main().catch((error: unknown) => {
  // 창이 숨은 채로 남지 않게 Rust 대비책(SHOW_FALLBACK_DELAY)이 창을 띄운다. 원인은 개발자 도구에서 본다.
  console.error('TodoWidget을 시작하지 못했어요', error);
});
