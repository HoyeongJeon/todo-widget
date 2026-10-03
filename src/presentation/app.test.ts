import { describe, expect, it } from 'vitest';
import App from './App.svelte';

describe('시험 화면', () => {
  it('Svelte 컴포넌트로 컴파일된다', () => {
    expect(typeof App).toBe('function');
  });
});
