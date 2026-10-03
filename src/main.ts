import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { mount } from 'svelte';
import { createWindowControls } from './adapters/tauri/window.ts';
import App from './presentation/App.svelte';
import type { WindowControlsPort } from './presentation/window-controls.ts';

const startedAt = performance.now();
const target = document.getElementById('app');
if (!target)
  throw new Error('#app 요소가 없어요');

const controls: WindowControlsPort = createWindowControls(invoke, getCurrentWindow());
mount(App, { target, props: { controls, startedAt } });
