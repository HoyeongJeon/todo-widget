import { describe, expect, it } from 'vitest';
import { endpointOverride } from './endpoint-config.ts';

describe('시험용 업데이트 주소', () => {
  it('REL-10 주소를 주면 그 주소 하나만 확인하는 Tauri 설정 조각을 만든다', () => {
    expect(endpointOverride('https://example.com/test/latest.json')).toEqual({
      plugins: { updater: { endpoints: ['https://example.com/test/latest.json'] } },
    });
  });

  it('REL-10 주소가 없으면 겹쳐 쓸 설정이 없다', () => {
    expect(endpointOverride(undefined)).toBeNull();
    expect(endpointOverride('')).toBeNull();
  });

  it('REL-10 https 주소가 아니면 거부한다', () => {
    expect(() => endpointOverride('http://example.com/latest.json')).toThrow('https');
    expect(() => endpointOverride('latest.json')).toThrow('https');
  });
});
