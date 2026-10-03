import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkArchitecture, layerOf } from '../tools/architecture/rules.ts';
import { collectSources } from '../tools/architecture/sources.ts';

const file = (path: string, text: string) => ({ path, text });

describe('층 구분', () => {
  it('src 아래 첫 폴더로 층을 정한다', () => {
    expect(layerOf('src/domain/todo-list.ts')).toBe('domain');
    expect(layerOf('src/adapters/tauri/window.ts')).toBe('adapters');
    expect(layerOf('src/main.ts')).toBe('root');
  });
});

describe('의존 방향', () => {
  it('domain은 다른 층을 가져올 수 없다', () => {
    const violations = checkArchitecture([file('src/domain/a.ts', "import { b } from '../application/b.ts';")]);
    expect(violations).toEqual([
      { path: 'src/domain/a.ts', line: 1, message: 'domain 층은 application 층(../application/b.ts)을 가져올 수 없어요' },
    ]);
  });

  it('application은 domain을 가져올 수 있지만 presentation은 안 된다', () => {
    const ok = checkArchitecture([file('src/application/a.ts', "import type { T } from '../domain/t.ts';")]);
    const bad = checkArchitecture([file('src/application/a.ts', "import V from '../presentation/V.svelte';")]);
    expect(ok).toEqual([]);
    expect(bad.map((v) => v.message)).toEqual(['application 층은 presentation 층(../presentation/V.svelte)을 가져올 수 없어요']);
  });

  it('presentation은 adapters를, adapters는 presentation을 가져올 수 없다', () => {
    const violations = checkArchitecture([
      file('src/presentation/a.ts', "import { x } from '../adapters/x.ts';"),
      file('src/adapters/b.ts', "export { y } from '../presentation/y.ts';"),
    ]);
    expect(violations.map((v) => v.path)).toEqual(['src/presentation/a.ts', 'src/adapters/b.ts']);
  });

  it('여러 줄 import와 동적 import도 검사하고 줄 번호를 알려 준다', () => {
    const text = ['// 첫 줄', 'import {', '  a,', "} from '../adapters/a.ts';", "const m = import('../adapters/m.ts');"].join('\n');
    const violations = checkArchitecture([file('src/domain/x.ts', text)]);
    expect(violations.map((v) => v.line)).toEqual([2, 5]);
  });

  it('composition root(src/main.ts)는 모든 층을 가져올 수 있다', () => {
    const text = "import App from './presentation/App.svelte';\nimport { w } from './adapters/w.ts';";
    expect(checkArchitecture([file('src/main.ts', text)])).toEqual([]);
  });

  it('Tauri는 adapters와 src/main.ts에서만 쓴다', () => {
    const violations = checkArchitecture([
      file('src/adapters/w.ts', "import { invoke } from '@tauri-apps/api/core';"),
      file('src/main.ts', "import { invoke } from '@tauri-apps/api/core';"),
      file('src/presentation/P.svelte', "<script>import { invoke } from '@tauri-apps/api/core';</script>"),
    ]);
    expect(violations).toEqual([
      {
        path: 'src/presentation/P.svelte',
        line: 1,
        message: 'presentation 층은 @tauri-apps/api/core를 쓸 수 없어요. Tauri는 adapters와 src/main.ts에서만 써요',
      },
    ]);
  });

  it('domain과 application은 바깥 패키지를 가져올 수 없다', () => {
    const violations = checkArchitecture([
      file('src/domain/a.ts', "import { writable } from 'svelte/store';"),
      file('src/application/b.ts', "import dayjs from 'dayjs';"),
      file('src/presentation/c.ts', "import { mount } from 'svelte';"),
      file('src/adapters/d.ts', "import { listen } from '@tauri-apps/api/event';"),
    ]);
    expect(violations).toEqual([
      { path: 'src/domain/a.ts', line: 1, message: 'domain 층은 바깥 패키지 svelte/store를 쓸 수 없어요. 허용 목록: 없음' },
      { path: 'src/application/b.ts', line: 1, message: 'application 층은 바깥 패키지 dayjs를 쓸 수 없어요. 허용 목록: 없음' },
    ]);
  });

  it('제품 코드는 어느 층에서도 Node 모듈을 쓸 수 없다', () => {
    const violations = checkArchitecture([
      file('src/presentation/a.ts', "import { readFileSync } from 'node:fs';"),
      file('src/main.ts', "import path from 'node:path';"),
      file('src/adapters/b.ts', "const os = await import('node:os');"),
    ]);
    expect(violations.map((v) => v.message)).toEqual([
      '제품 코드는 Node 모듈(node:fs)을 쓸 수 없어요. 앱은 WebView에서 돌아요',
      '제품 코드는 Node 모듈(node:path)을 쓸 수 없어요. 앱은 WebView에서 돌아요',
      '제품 코드는 Node 모듈(node:os)을 쓸 수 없어요. 앱은 WebView에서 돌아요',
    ]);
  });
});

describe('네트워크 사용 제한', () => {
  it('PRIV-01 네트워크 API는 updater adapter 밖에서 쓰지 않는다', () => {
    const violations = checkArchitecture([
      file('src/presentation/a.ts', "await fetch('https://example.com');"),
      file('src/application/b.ts', 'const ws = new WebSocket(url);'),
      file('src/adapters/http.ts', "import { fetch } from '@tauri-apps/plugin-http';"),
      file('src/adapters/updater/check.ts', "const r = await fetch(url);"),
    ]);
    expect(violations.map((v) => v.path)).toEqual([
      'src/presentation/a.ts',
      'src/application/b.ts',
      'src/adapters/http.ts',
    ]);
    expect(violations[0]?.message).toBe('네트워크는 src/adapters/updater/에서만 써요 (PRIV-01): fetch(');
  });

  it('PRIV-01 Tauri의 websocket·upload plugin도 이름을 바꿔 가져와도 네트워크로 본다', () => {
    const violations = checkArchitecture([
      file('src/adapters/sock.ts', "import Sock from '@tauri-apps/plugin-websocket';"),
      file('src/adapters/send.ts', "import { upload as send } from '@tauri-apps/plugin-upload';"),
      file('src/adapters/updater/sock.ts', "import Sock from '@tauri-apps/plugin-websocket';"),
    ]);
    expect(violations).toEqual([
      {
        path: 'src/adapters/sock.ts',
        line: 1,
        message: '네트워크는 src/adapters/updater/에서만 써요 (PRIV-01): @tauri-apps/plugin-websocket',
      },
      {
        path: 'src/adapters/send.ts',
        line: 1,
        message: '네트워크는 src/adapters/updater/에서만 써요 (PRIV-01): @tauri-apps/plugin-upload',
      },
    ]);
  });

  it('PRIV-01 실제 소스가 층 규칙과 네트워크 제한을 지킨다', () => {
    const root = fileURLToPath(new URL('..', import.meta.url));
    expect(checkArchitecture(collectSources(root))).toEqual([]);
  });
});
