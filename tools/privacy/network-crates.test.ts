import { describe, expect, it } from 'vitest';
import { NETWORK_CRATES, checkNetworkCrates, directDependents } from './network-crates.ts';

const reqwestTree = [
  '0reqwest v0.12.24',
  '1tauri-plugin-updater v2.13.1',
  '2todo-widget v2.0.0 (/repo/src-tauri)',
].join('\n');

describe('Rust 네트워크 crate 검사', () => {
  it('cargo tree -i 출력에서 바로 위 의존자만 고른다', () => {
    expect(directDependents(reqwestTree)).toEqual(['tauri-plugin-updater']);
  });

  it('PRIV-01 reqwest는 updater plugin만 쓰고 다른 HTTP crate는 없어야 한다', () => {
    expect(checkNetworkCrates((crate) => (crate === 'reqwest' ? reqwestTree : null))).toEqual([]);
  });

  it('PRIV-01 다른 crate가 reqwest를 쓰거나 다른 HTTP crate가 있으면 알린다', () => {
    const extra = `${reqwestTree}\n1tauri-plugin-http v2.5.0\n2todo-widget v2.0.0 (/repo/src-tauri)`;
    expect(checkNetworkCrates((crate) => (crate === 'reqwest' ? extra : crate === 'ureq' ? '0ureq v2.0.0\n1some-crate v1.0.0' : null))).toEqual([
      'reqwest를 tauri-plugin-http가 써요. 네트워크는 tauri-plugin-updater만 써야 해요 (PRIV-01)',
      'ureq가 의존성에 있어요 (PRIV-01)',
    ]);
  });

  it('PRIV-01 의존 트리에서 바로 위 의존자를 하나도 읽지 못하면 통과시키지 않고 알린다', () => {
    const unreadable = 'reqwest v0.12.24\n└── tauri-plugin-updater v2.13.1';
    expect(checkNetworkCrates((crate) => (crate === 'reqwest' ? unreadable : null))).toEqual([
      'reqwest 의존 트리를 읽지 못했어요 (cargo tree 출력 형식이 바뀌었을 수 있어요) (PRIV-01)',
    ]);
  });

  it('PRIV-01 HTTP·WebSocket crate 목록에 hyper, hyper-util, minreq, tungstenite, tokio-tungstenite가 있고 hyper 계열은 reqwest 경로만 허용한다', () => {
    expect(Object.keys(NETWORK_CRATES)).toEqual(
      expect.arrayContaining(['hyper', 'hyper-util', 'minreq', 'tungstenite', 'tokio-tungstenite']),
    );
    expect(NETWORK_CRATES['hyper-util']).toEqual(['hyper-rustls', 'reqwest']);
    expect(NETWORK_CRATES.hyper).toEqual(['hyper-rustls', 'hyper-util', 'reqwest']);
    expect(NETWORK_CRATES.minreq).toEqual([]);
  });
});
