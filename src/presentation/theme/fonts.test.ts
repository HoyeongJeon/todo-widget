import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fontStack } from './fonts.ts';

const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8');

/** theme.css에서 변수의 첫 글꼴. */
function firstFont(variable: string): string {
  const match = new RegExp(`${variable}:\\s*([^,;]+)`).exec(css);
  return (match?.[1] ?? '').replaceAll('"', '').trim();
}

describe('글꼴', () => {
  it('I18N-06 MAC-09 WIN-08 화면 언어와 OS로 글꼴 변수를 고른다. 독일어는 영어와 같다', () => {
    expect(fontStack('macos', 'ko')).toBe('var(--font-macos-ko)');
    expect(fontStack('macos', 'de')).toBe('var(--font-macos-en)');
    expect(fontStack('windows', 'en')).toBe('var(--font-windows-en)');
    expect(fontStack('windows', 'zh-Hans')).toBe('var(--font-windows-zh)');
  });

  it('I18N-06 MAC-09 WIN-08 글꼴 변수의 첫 글꼴은 글꼴 표대로다', () => {
    expect(firstFont('--font-macos-ko')).toBe('Apple SD Gothic Neo');
    expect(firstFont('--font-macos-en')).toBe('-apple-system');
    expect(firstFont('--font-macos-zh')).toBe('PingFang SC');
    expect(firstFont('--font-windows-ko')).toBe('Malgun Gothic');
    expect(firstFont('--font-windows-en')).toBe('Segoe UI');
    expect(firstFont('--font-windows-zh')).toBe('Microsoft YaHei');
  });

  it('I18N-06 다른 언어로 쓴 제목도 깨지지 않게 세 언어 글꼴을 모두 뒤에 둔다', () => {
    for (const os of ['macos', 'windows']) {
      for (const tag of ['ko', 'en', 'zh']) {
        const line = new RegExp(`--font-${os}-${tag}:([^;]+);`).exec(css)?.[1] ?? '';
        const fonts = os === 'macos' ? ['Apple SD Gothic Neo', 'PingFang SC'] : ['Malgun Gothic', 'Microsoft YaHei'];
        for (const font of fonts)
          expect(line, `${os}-${tag}`).toContain(font);
      }
    }
  });

  it('WND-13 배경 세 가지는 카드 불투명도(--a)를 알파로 쓰도록 RGB 숫자로 둔다', () => {
    expect(css).toMatch(/--card: 255, 255, 255;/);
    expect(css).toMatch(/--foldbg: 246, 245, 242;/);
    expect(css).toMatch(/--doingbg: 253, 241, 232;/);
  });
});
