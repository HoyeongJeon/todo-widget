import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync(new URL('../../../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
const updater = config.plugins?.updater ?? {};

describe('업데이트 설정', () => {
  it('UPD-02 확인 주소는 모든 사용자에게 같은 GitHub Release의 latest.json 하나다', () => {
    expect(updater.endpoints).toHaveLength(1);
    expect(updater.endpoints[0]).toMatch(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/releases\/latest\/download\/latest\.json$/);
    expect(updater.endpoints[0]).not.toContain('{{');
  });

  it('UPD-02 요청에 따로 붙이는 header가 없다', () => {
    expect(updater.headers).toBeUndefined();
  });

  it('UPD-08 앱에 업데이트 전용 공개 키가 들어 있다', () => {
    expect(typeof updater.pubkey).toBe('string');
    expect(updater.pubkey.length).toBeGreaterThan(40);
  });

  it('UPD-08 REL-06 계획 4의 개발용 임시 키가 아니라 출시용 키다', () => {
    const DEV_KEY_ID = '2167B06B9D2D9222';
    expect(Buffer.from(updater.pubkey, 'base64').toString('utf8')).not.toContain(DEV_KEY_ID);
  });
});
