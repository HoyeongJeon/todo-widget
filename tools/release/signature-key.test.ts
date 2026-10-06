import { describe, expect, it } from 'vitest';
import { checkSignatureKeys, keyIdFromPublicKey, keyIdFromSignature } from './signature-key.ts';

// `pnpm tauri signer generate`로 만든 버리는 키 두 개(A, B)의 공개 키와, 같은 파일을 각 키로 `pnpm tauri signer sign`한 .sig 내용.
// 개인 키는 만든 뒤 바로 지웠다. 저장소에는 공개 키와 서명만 둔다.
const pubA = 'dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDRGRTExNEEwMjU3NjlERDMKUldUVG5YWWxvQlRoVDNXSkV5WFZka1lmclhnbHhsS0QxNW9XU0ZFSkpBUUxoTzQ0TzE5TVM3VjkK';
const sigA = 'dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVUVG5YWWxvQlRoVDN5dDlRblpjYjVGa2tHcDVjd2k4dWdUSjBpTTJidG45cnZ0VHlxZ24yMHROUFZEam13QitWOThjNDFHRUZSWFpZdk9ISnpWaXE5QmJJQmZoSko3K1EwPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzkxMzI4NjE3CWZpbGU6ZmlsZS5iaW4KYTF5aTZFMmpFNThTSHQ5NE41d1c2cERHdEFkUG5lTHJ6cmJYd0FVVlVaVWh1RHkzblV3bzhURGY1dFpnYzdycnNlY1YrVEdDNzdRRU9sV0NqLytaRFE9PQo=';
const pubB = 'dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEQ0ODYzNEZCMEREQkUzQTcKUldTbjQ5c04relNHMUI0RzBzQXJMbUZxZHRldmhMS1FvSUVObkw0TTBGbS9TVHRCWnN2UG13ajEK';
const sigB = 'dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVTbjQ5c04relNHMUtNdkNRVXNnOWNkZVk0WFBSK2JMdjRTeWVIT0NoV0M4aUlDUVhqZzZBcm4yN3FLeXJYVHVXMWVUQXpBUFFmekU2cHdkRHNRTW9ZTysyekJXZHhIMXc0PQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzkxMzI4NjE3CWZpbGU6ZmlsZS5iaW4KcTBOeitzU3Q5b3dOSG5HczMvc1VNWURTdkpwcklpL3hJY1pPZjNPNnZoYmlFNHhFS1VoQm1nY29GZW9kZlQ5dGdSck0vaHpwMXVBZHRpRkNDZDdRRGc9PQo=';

describe('업데이트 서명 키', () => {
  it('REL-06 공개 키와 그 키로 만든 서명에서 같은 키 ID를 읽는다', () => {
    expect(keyIdFromPublicKey(pubA)).toBe('d39d7625a014e14f');
    expect(keyIdFromSignature(sigA)).toBe('d39d7625a014e14f');
    expect(keyIdFromPublicKey(pubB)).toBe(keyIdFromSignature(sigB));
    expect(keyIdFromPublicKey(pubB)).not.toBe(keyIdFromPublicKey(pubA));
  });

  it('REL-06 .sig 파일 끝의 줄바꿈은 무시한다', () => {
    expect(keyIdFromSignature(`${sigA}\n`)).toBe('d39d7625a014e14f');
  });

  it('REL-06 모든 서명이 앱의 공개 키로 만든 것이면 문제가 없다', () => {
    expect(checkSignatureKeys(pubA, [{ name: 'a.app.tar.gz.sig', content: sigA }, { name: 'a-setup.exe.sig', content: sigA }])).toEqual([]);
  });

  it('REL-06 다른 키로 만든 서명이 있으면 실패한다', () => {
    expect(checkSignatureKeys(pubA, [{ name: 'a.app.tar.gz.sig', content: sigA }, { name: 'b-setup.exe.sig', content: sigB }])).toEqual([
      'b-setup.exe.sig의 서명 키가 앱의 공개 키와 달라요. 출시용 키를 Secrets에 넣었는지, tauri.conf.json의 pubkey가 그 키인지 확인해 주세요 (REL-06)',
    ]);
  });

  it('REL-06 읽을 수 없는 서명은 실패한다', () => {
    expect(checkSignatureKeys(pubA, [{ name: 'x.sig', content: 'not a signature!' }, { name: 'empty.sig', content: '' }])).toEqual([
      'x.sig의 서명을 읽을 수 없어요 (REL-06)',
      'empty.sig의 서명을 읽을 수 없어요 (REL-06)',
    ]);
  });

  it('REL-06 서명 자리에 공개 키가 오면 읽을 수 없는 서명으로 본다', () => {
    expect(checkSignatureKeys(pubA, [{ name: 'pub.sig', content: pubA }])).toEqual(['pub.sig의 서명을 읽을 수 없어요 (REL-06)']);
  });

  it('REL-06 읽을 수 없는 공개 키는 실패한다', () => {
    expect(checkSignatureKeys('garbage', [{ name: 'a.sig', content: sigA }])).toEqual([
      'tauri.conf.json의 업데이트 공개 키(plugins.updater.pubkey)를 읽을 수 없어요 (REL-06)',
    ]);
    expect(checkSignatureKeys(sigA, [{ name: 'a.sig', content: sigA }])).toEqual([
      'tauri.conf.json의 업데이트 공개 키(plugins.updater.pubkey)를 읽을 수 없어요 (REL-06)',
    ]);
  });
});
