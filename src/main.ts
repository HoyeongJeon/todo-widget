import { invoke } from '@tauri-apps/api/core';
import { availableMonitors, getCurrentWindow, primaryMonitor } from '@tauri-apps/api/window';
import { mount } from 'svelte';
import type { DesktopOs } from './adapters/tauri/coordinates.ts';
import { createWindowController } from './adapters/tauri/window-controller.ts';
import App from './presentation/App.svelte';

const startedAt = performance.now();
const target = document.getElementById('app');
if (!target)
  throw new Error('#app 요소가 없어요');

const current = getCurrentWindow();
const os: DesktopOs = navigator.userAgent.includes('Windows') ? 'windows' : 'macos'; // Task 8에서 Rust app_info로 바꾼다
const windowController = createWindowController({
  api: {
    outerPosition: () => current.outerPosition(),
    outerSize: () => current.outerSize(),
    scaleFactor: () => current.scaleFactor(),
    startDragging: () => current.startDragging(),
    onMoved: (handler) => current.onMoved(() => handler()),
    primaryMonitor,
    availableMonitors,
  },
  invoke,
  os,
  pointer: window,
  requestFrame: (callback) => requestAnimationFrame(() => callback()),
});
mount(App, { target, props: { windowController, startedAt } });
