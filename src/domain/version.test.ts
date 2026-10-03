import { describe, expect, it } from 'vitest';
import { isNewerVersion } from './version.ts';

describe('새 버전', () => {
  it('지금보다 높은 버전만 새 버전이다', () => {
    expect(isNewerVersion('2.1.0', '2.0.0')).toBe(true);
    expect(isNewerVersion('2.0.1', '2.0.0')).toBe(true);
    expect(isNewerVersion('3.0.0', '2.9.9')).toBe(true);
    expect(isNewerVersion('2.0.0', '2.0.0')).toBe(false);
    expect(isNewerVersion('1.9.0', '2.0.0')).toBe(false);
  });

  it('자리마다 숫자로 비교한다 (2.0.10 > 2.0.9)', () => {
    expect(isNewerVersion('2.0.10', '2.0.9')).toBe(true);
  });

  it('앞의 v는 허용하고, 형식이 다르면 새 버전이 아니다', () => {
    expect(isNewerVersion('v2.1.0', '2.0.0')).toBe(true);
    expect(isNewerVersion('2.1', '2.0.0')).toBe(false);
    expect(isNewerVersion('abc', '2.0.0')).toBe(false);
    expect(isNewerVersion('2.1.0-rc.1', '2.0.0')).toBe(false);
  });
});
