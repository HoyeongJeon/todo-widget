import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
const mainWindow = config.app.windows.find((w: { label: string }) => w.label === 'main');
const cargoToml = readFileSync(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8');

/** 업데이트 확인(tauri-plugin-updater) 말고는 Rust 쪽에서 네트워크를 쓰지 않는다 (PRIV-01) */
const NETWORK_CRATES = [
  'reqwest',
  'hyper',
  'ureq',
  'isahc',
  'surf',
  'attohttpc',
  'curl',
  'tungstenite',
  'tokio-tungstenite',
  'tauri-plugin-http',
  'tauri-plugin-websocket',
  'tauri-plugin-upload',
];

const DEPENDENCY_SECTION =
  /^\[\s*(?:target\.(?:'[^']*'|"[^"]*"|[^.\]]+)\.)?dependencies(?:\.(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_-]+)))?\s*\]$/;
const DEPENDENCY_KEY = /^(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_-]+))\s*[.=]/;
const RENAMED_PACKAGE = /\bpackage\s*=\s*(?:"([^"]+)"|'([^']+)')/;

/** [dependencies]와 [target.*.dependencies]에 적힌 crate 이름을 줄 단위로 모은다. package = "..."(또는 '...')로 바꾼 이름도 본다. */
function dependencyNames(toml: string): string[] {
  const names: string[] = [];
  let inDependencies = false;
  let inOneCrateTable = false;
  for (const raw of toml.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (line.startsWith('[')) {
      const section = DEPENDENCY_SECTION.exec(line);
      const tableName = section?.[1] ?? section?.[2] ?? section?.[3];
      inDependencies = section !== null;
      inOneCrateTable = tableName !== undefined;
      if (tableName)
        names.push(tableName);
      continue;
    }
    if (!inDependencies)
      continue;
    const key = inOneCrateTable ? null : DEPENDENCY_KEY.exec(line);
    if (key)
      names.push(key[1] ?? key[2] ?? key[3] ?? '');
    const renamed = RENAMED_PACKAGE.exec(line);
    const renamedTo = renamed?.[1] ?? renamed?.[2];
    if (renamedTo)
      names.push(renamedTo);
  }
  return names;
}

describe('Tauri 설정', () => {
  it('MAC-10 투명 창을 위해 macOSPrivateApi를 켠다', () => {
    expect(config.app.macOSPrivateApi).toBe(true);
    expect(mainWindow.transparent).toBe(true);
  });

  it('REL-09 macOS 빌드는 ad-hoc 서명을 한다', () => {
    expect(config.bundle.macOS.signingIdentity).toBe('-');
  });

  it('WIN-02 창은 테두리 없이 숨긴 채 시작하고 작업 표시줄에 나오지 않는다', () => {
    expect(mainWindow).toMatchObject({
      decorations: false,
      visible: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      visibleOnAllWorkspaces: true,
      shadow: false,
    });
  });

  it('식별자와 제품 이름이 정해진 값이다', () => {
    expect(config.identifier).toBe('io.github.hoyeongjeon.todowidget');
    expect(config.productName).toBe('TodoWidget');
  });

  it('PRIV-01 Rust 쪽은 업데이트 말고 네트워크 crate와 plugin을 쓰지 않는다', () => {
    const names = dependencyNames(cargoToml);
    expect(names).toEqual(expect.arrayContaining(['tauri', 'serde', 'objc2-service-management']));
    expect(names.filter((name) => NETWORK_CRATES.includes(name))).toEqual([]);
  });

  it('PRIV-01 Cargo.toml 읽기는 target 표, 하위 표, 바꾼 이름까지 찾는다', () => {
    const toml = [
      '[package]',
      'name = "reqwest"',
      '[build-dependencies]',
      'curl = "0.4"',
      '[dependencies]',
      'net = { package = "ureq", version = "2" } # 이름을 바꿔도 찾는다',
      '[target.\'cfg(windows)\'.dependencies]',
      'hyper.version = "1"',
      '\'isahc\' = "1"',
      'web = { package = \'surf\' }',
      '[target."cfg(unix)".dependencies.reqwest]',
      'version = "0.12"',
      '[dependencies.\'reqwest\']',
      'version = "0.12"',
      '[target.\'cfg(unix)\'.dependencies.\'reqwest\']',
      'version = "0.12"',
    ].join('\n');
    expect(dependencyNames(toml)).toEqual(['net', 'ureq', 'hyper', 'isahc', 'web', 'surf', 'reqwest', 'reqwest', 'reqwest']);
  });

  it('MAC-03 메뉴 막대 아이콘은 18pt @2x(36×36) PNG이고, 아이콘은 저장소의 SVG 원본에서 만든다', () => {
    const png = readFileSync(new URL('../src-tauri/icons/tray-template.png', import.meta.url));
    expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([36, 36]);
    expect(existsSync(new URL('../src-tauri/icons/source/app-icon.svg', import.meta.url))).toBe(true);
    expect(existsSync(new URL('../src-tauri/icons/source/tray-template.svg', import.meta.url))).toBe(true);
  });

  it('MAC-04 I18N-02 메뉴 막대 메뉴의 기본 문구를 Rust에 한국어로 두지 않는다', () => {
    const macos = readFileSync(new URL('../src-tauri/src/platform/macos.rs', import.meta.url), 'utf8');
    const items = [...macos.matchAll(/MenuItem::with_id\([^)]*\)/g)].map((m) => m[0]);
    expect(items).toHaveLength(2);
    expect(items.join('\n')).not.toMatch(/\p{Script=Hangul}/u);
  });
});
