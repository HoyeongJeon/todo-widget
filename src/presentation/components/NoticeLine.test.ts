// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { flush } from '../../testing/fake-timer.ts';
import { createTestApp } from '../../testing/test-app.ts';
import { createTranslator } from '../i18n/translator.ts';
import { WidgetViewModel } from '../widget-view-model.svelte.ts';
import NoticeLine from './NoticeLine.svelte';

afterEach(() => cleanup());

describe('안내 줄', () => {
  it('START-09 알릴 일이 없으면 보이지 않는다', async () => {
    const { app } = await createTestApp();
    const vm = new WidgetViewModel({ app, t: createTranslator('ko'), report: () => undefined });
    const { container } = render(NoticeLine, { props: { vm } });
    expect(container.querySelector('.notice')).toBeNull();
  });

  it('UPD-03 UPD-04 "새 버전이 있어요 · 업데이트"를 보이고, 업데이트를 누르면 설치한다', async () => {
    const { app, updater } = await createTestApp();
    const vm = new WidgetViewModel({ app, t: createTranslator('ko'), report: () => undefined });
    await app.updates.check();
    const { container } = render(NoticeLine, { props: { vm } });
    expect(container.querySelector('.notice')?.textContent).toContain('새 버전이 있어요');
    expect(container.querySelector('.notice .sep')?.textContent).toBe('·');
    expect(container.querySelector('.action')?.textContent).toBe('업데이트');
    await fireEvent.click(container.querySelector('.action') as HTMLButtonElement);
    await flush();
    expect(updater.installs).toBe(1);
  });
});
