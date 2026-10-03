import { describe, expect, it } from 'vitest';
import { resolveDataDir } from './data-dir.ts';

describe('데이터 폴더', () => {
  it('STORE-18 TODOWIDGET_DATA_DIR 값이 있으면 그 폴더, 없거나 빈 문자열이면 OS 기본 폴더다', () => {
    expect(resolveDataDir('/tmp/dev-data', '/Users/me/Library/Application Support/TodoWidget')).toBe('/tmp/dev-data');
    expect(resolveDataDir('', '/기본')).toBe('/기본');
    expect(resolveDataDir(undefined, '/기본')).toBe('/기본');
    expect(resolveDataDir(null, '/기본')).toBe('/기본');
  });
});
