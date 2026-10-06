import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // svelteTesting: 테스트 라이브러리도 Vite가 컴파일하게 한다(라이브러리 안에 runes 파일이 있다).
  // 테스트 뒤 정리는 컴포넌트 테스트 파일이 afterEach(cleanup)로 직접 한다. node 환경 테스트에 DOM 정리를 끼우지 않기 위해서다.
  plugins: [svelte({ configFile: false }), svelteTesting({ autoCleanup: false })],
  clearScreen: false,
  // 개발 서버가 Rust 빌드 결과(src-tauri/target)까지 감시하지 않게 한다 (계획 2에서 넘긴 일).
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  build: { target: 'es2022' },
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
  },
});
