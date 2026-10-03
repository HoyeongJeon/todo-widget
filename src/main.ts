import { mount } from 'svelte';
import App from './presentation/App.svelte';

const target = document.getElementById('app');
if (!target)
  throw new Error('#app 요소가 없어요');

mount(App, { target, props: {} });
