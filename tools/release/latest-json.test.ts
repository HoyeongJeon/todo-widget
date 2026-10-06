import { describe, expect, it } from 'vitest';
import { makeLatestJson } from './latest-json.ts';

describe('latest.json', () => {
  it('REL-03 버전, 공개 시각, OS별 업데이트 파일 주소와 서명을 담는다. 두 Mac CPU는 같은 universal 파일을 가리킨다', () => {
    const json = makeLatestJson({
      version: '2.1.0',
      notes: 'TodoWidget 2.1.0',
      pubDate: '2026-10-08T00:00:00.000Z',
      repo: 'HoyeongJeon/todo-widget',
      tag: 'v2.1.0',
      mac: { name: 'TodoWidget.app.tar.gz', signature: 'mac-sig\n' },
      windows: { name: 'TodoWidget_2.1.0_x64-setup.exe', signature: 'win-sig' },
    });
    const mac = { signature: 'mac-sig', url: 'https://github.com/HoyeongJeon/todo-widget/releases/download/v2.1.0/TodoWidget.app.tar.gz' };
    expect(json).toEqual({
      version: '2.1.0',
      notes: 'TodoWidget 2.1.0',
      pub_date: '2026-10-08T00:00:00.000Z',
      platforms: {
        'darwin-aarch64': mac,
        'darwin-x86_64': mac,
        'windows-x86_64': {
          signature: 'win-sig',
          url: 'https://github.com/HoyeongJeon/todo-widget/releases/download/v2.1.0/TodoWidget_2.1.0_x64-setup.exe',
        },
      },
    });
  });

  it('REL-03 파일 이름의 특수 문자는 주소에 맞게 바꾼다', () => {
    const json = makeLatestJson({
      version: '2.1.0', notes: '', pubDate: 'x', repo: 'a/b', tag: 'v2.1.0',
      mac: { name: 'Todo Widget.app.tar.gz', signature: 's' },
      windows: { name: 'w.exe', signature: 's' },
    });
    expect(json.platforms['darwin-aarch64'].url).toBe('https://github.com/a/b/releases/download/v2.1.0/Todo%20Widget.app.tar.gz');
  });
});
