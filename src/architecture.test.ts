import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkCopy, looksLikeCopy } from '../tools/architecture/copy.ts';
import { checkArchitecture, layerOf } from '../tools/architecture/rules.ts';
import { collectSources } from '../tools/architecture/sources.ts';

const file = (path: string, text: string) => ({ path, text });

describe('층 구분', () => {
  it('src 아래 첫 폴더로 층을 정한다', () => {
    expect(layerOf('src/domain/todo-list.ts')).toBe('domain');
    expect(layerOf('src/adapters/tauri/window.ts')).toBe('adapters');
    expect(layerOf('src/main.ts')).toBe('root');
    expect(layerOf('src/testing/fake-clock.ts')).toBe('testing');
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

  it('src/testing/의 가짜는 테스트 파일만 가져온다. composition root를 포함한 제품 코드는 가져올 수 없다', () => {
    const violations = checkArchitecture([
      file('src/main.ts', "import { FakeClock } from './testing/fake-clock.ts';"),
      file('src/application/a.ts', "import { MemoryFileStore } from '../testing/memory-file-store.ts';"),
      file('src/adapters/b.ts', "import { FakeTimer } from '../testing/fake-timer.ts';"),
      file('src/presentation/c.ts', "import { FakeUpdater } from '../testing/fake-updater.ts';"),
      file('src/domain/d.ts', "import { sequenceIds } from '../testing/sequence-ids.ts';"),
    ]);
    expect(violations.map((v) => v.message)).toEqual([
      'root 층은 테스트 전용 src/testing/(./testing/fake-clock.ts)을 가져올 수 없어요',
      'application 층은 테스트 전용 src/testing/(../testing/memory-file-store.ts)을 가져올 수 없어요',
      'adapters 층은 테스트 전용 src/testing/(../testing/fake-timer.ts)을 가져올 수 없어요',
      'presentation 층은 테스트 전용 src/testing/(../testing/fake-updater.ts)을 가져올 수 없어요',
      'domain 층은 테스트 전용 src/testing/(../testing/sequence-ids.ts)을 가져올 수 없어요',
    ]);
  });

  it('src/testing/의 가짜는 port를 구현하려고 domain·application과 다른 가짜를 가져올 수 있지만, adapters나 presentation은 안 된다', () => {
    const ok = checkArchitecture([
      file('src/testing/a.ts', "import type { FileStore } from '../application/ports/file-store.ts';\nimport { Timestamp } from '../domain/timestamp.ts';\nimport { FakeClock } from './fake-clock.ts';"),
    ]);
    const bad = checkArchitecture([file('src/testing/b.ts', "import { x } from '../adapters/x.ts';")]);
    expect(ok).toEqual([]);
    expect(bad.map((v) => v.message)).toEqual(['testing 층은 adapters 층(../adapters/x.ts)을 가져올 수 없어요']);
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

  it('PRIV-01 Tauri updater plugin은 updater adapter에서만 쓴다', () => {
    const violations = checkArchitecture([
      file('src/adapters/tauri/x.ts', "import { check } from '@tauri-apps/plugin-updater';"),
      file('src/adapters/updater/tauri-updater.ts', "import { check } from '@tauri-apps/plugin-updater';"),
    ]);
    expect(violations).toEqual([
      { path: 'src/adapters/tauri/x.ts', line: 1, message: '네트워크는 src/adapters/updater/에서만 써요 (PRIV-01): @tauri-apps/plugin-updater' },
    ]);
  });

  it('PRIV-01 invoke로 updater·http·websocket·upload plugin 명령을 바로 불러도 네트워크로 본다', () => {
    const violations = checkArchitecture([
      file('src/adapters/tauri/x.ts', "await invoke('plugin:updater|check');"),
      file('src/presentation/y.ts', 'await invoke("plugin:http|fetch", args);'),
      file('src/adapters/tauri/w.ts', 'await invoke(`plugin:http|fetch_send`);'),
      file('src/adapters/tauri/v.ts', "await invoke('plugin:websocket|connect');"),
      file('src/adapters/tauri/u.ts', "await invoke('plugin:upload|upload');"),
      file('src/adapters/updater/z.ts', "await invoke('plugin:updater|check');"),
    ]);
    expect(violations.map((v) => v.path)).toEqual([
      'src/adapters/tauri/x.ts',
      'src/presentation/y.ts',
      'src/adapters/tauri/w.ts',
      'src/adapters/tauri/v.ts',
      'src/adapters/tauri/u.ts',
    ]);
    expect(violations[0]?.message).toBe("네트워크는 src/adapters/updater/에서만 써요 (PRIV-01): 'plugin:updater|");
  });

  it('PRIV-01 실제 소스가 층 규칙과 네트워크 제한을 지킨다', () => {
    const root = fileURLToPath(new URL('..', import.meta.url));
    expect(checkArchitecture(collectSources(root))).toEqual([]);
  });
});

describe('하드코딩 문구 검사', () => {
  it('I18N-02 문구로 보이는 문자열을 가려낸다', () => {
    expect(['할 일', 'Add a task', "Can't save", 'Löschen', '{n}개 남음'].map(looksLikeCopy)).toEqual([true, true, true, true, true]);
    expect(['', '⋯', '·', '%', '+', 'keydown', 'app.title', 'text/plain', 'row doing', '0px', '{n}', 'plugin:x'].map(looksLikeCopy)).toEqual(
      new Array(12).fill(false),
    );
  });

  it('I18N-02 템플릿 글자, 보이는 속성의 고정 글, 문구 같은 문자열 리터럴을 찾는다', () => {
    const svelte = [
      '<script lang="ts">',
      "  const label = '할 일';",
      '</script>',
      '<button title="Menu">Add</button>',
      '<input placeholder="{x} tasks" />',
    ].join('\n');
    const violations = checkCopy([
      file('src/presentation/A.svelte', svelte),
      file('src/presentation/b.ts', "export const hint = 'Add a task';\nexport const left = `${n}개 남음`;"),
    ]);
    expect(violations.map((v) => `${v.path}:${v.line}`)).toEqual([
      'src/presentation/A.svelte:2',
      'src/presentation/A.svelte:4',
      'src/presentation/A.svelte:4',
      'src/presentation/A.svelte:5',
      'src/presentation/b.ts:1',
      'src/presentation/b.ts:2',
    ]);
    expect(violations[0]?.message).toBe('화면 문구는 사전에서 꺼내요 (I18N-02): 할 일');
  });

  it('I18N-02 값 자리가 있는 영어 문구와 숫자가 섞인 영어 문구도 찾는다', () => {
    expect(['3 tasks left', '{n} tasks left'].map(looksLikeCopy)).toEqual([true, true]);
    const violations = checkCopy([
      file('src/presentation/e.ts', "export const left = `${n} tasks left`;\nexport const fixed = '3 tasks left';"),
      file('src/presentation/E.svelte', '<span>{`${n} tasks left`}</span>'),
    ]);
    expect(violations.map((v) => `${v.path}:${v.line} ${v.message}`)).toEqual([
      'src/presentation/e.ts:1 화면 문구는 사전에서 꺼내요 (I18N-02): {n} tasks left',
      'src/presentation/e.ts:2 화면 문구는 사전에서 꺼내요 (I18N-02): 3 tasks left',
      'src/presentation/E.svelte:1 화면 문구는 사전에서 꺼내요 (I18N-02): {n} tasks left',
    ]);
  });

  it('I18N-02 label·aria-* 속성과 버튼 input의 value도 보이는 글로 본다', () => {
    const svelte = [
      '<X label="Delete all" />',
      '<div aria-description="Drag to move" aria-hidden="true" aria-haspopup="menu" aria-labelledby="reset-question"></div>',
      '<input type="submit" value="Save" />',
      '<input value="Go" type="button" />',
      '<input type="range" value="50" /><input type="text" value={draft} />',
    ].join('\n');
    expect(checkCopy([file('src/presentation/F.svelte', svelte)]).map((v) => `${v.line} ${v.message}`)).toEqual([
      '1 화면 문구는 사전에서 꺼내요 (I18N-02): Delete all',
      '2 화면 문구는 사전에서 꺼내요 (I18N-02): Drag to move',
      '3 화면 문구는 사전에서 꺼내요 (I18N-02): Save',
      '4 화면 문구는 사전에서 꺼내요 (I18N-02): Go',
    ]);
  });

  it('I18N-02 기호, 기술 문자열, CSS 클래스, 주석, 스타일, 개발자용 문장, 사전 파일, presentation 밖은 통과한다', () => {
    const svelte = [
      '<script lang="ts">',
      '  // 한국어 주석은 괜찮다',
      "  import Icon from './Icon.svelte';",
      "  const key = 'app.title';",
      "  const classes = 'row doing';",
      "  console.error('창을 보이지 못했어요', error);",
      "  window.addEventListener('wheel', onWheel);",
      '  /* 할 일 */',
      '</script>',
      '<!-- 할 일 -->',
      '<span class="sep">·</span><span class="plus">+</span>{vm.t(\'app.title\')}<span>{n}%</span>',
      '<div style:padding-top="{lift}px" class="row {status}" onclick={() => a > b}></div>',
      '<style>.a::after { content: "할 일"; }</style>',
    ].join('\n');
    expect(
      checkCopy([
        file('src/presentation/B.svelte', svelte),
        file('src/presentation/i18n/ko.ts', "export const ko = { 'app.title': '할 일' };"),
        file('src/presentation/c.ts', "throw new Error('ViewModel이 없어요');\nconst url = `${base}/x`;"),
        file('src/application/d.ts', "const label = '할 일';"),
      ]),
    ).toEqual([]);
  });

  it('I18N-02 속성 선택자는 기술 문자열이라 통과하고, 같은 파일의 문장은 여전히 찾는다', () => {
    expect(['[data-focus-home]', 'input[type="text"]', "button[aria-pressed='true']"].map(looksLikeCopy)).toEqual([false, false, false]);
    expect(['[Add a task]', 'Save = done', '[할일]', "Don't", "Can't", '[Beta]', "'Done'", 'x=y'].map(looksLikeCopy)).toEqual(new Array(8).fill(true));
    const violations = checkCopy([
      file('src/presentation/g.ts', "const home = document.querySelector('[data-focus-home]');\nconst field = 'input[type=\"text\"]';\nconst hint = 'Add a task';"),
    ]);
    expect(violations.map((v) => `${v.line} ${v.message}`)).toEqual(['3 화면 문구는 사전에서 꺼내요 (I18N-02): Add a task']);
  });

  it('I18N-02 실제 화면 코드에는 사전 밖의 화면 문구가 없다', () => {
    const root = fileURLToPath(new URL('..', import.meta.url));
    expect(checkCopy(collectSources(root))).toEqual([]);
  });
});
