/**
 * 업데이트 서명(.sig)이 앱에 든 공개 키로 만든 것인지 본다 (REL-06, UPD-08).
 * Tauri CLI는 TAURI_SIGNING_PRIVATE_KEY가 plugins.updater.pubkey와 달라도 경고만 하고 빌드한다.
 * 그런 Release가 나가면 설치한 위젯이 모든 다음 업데이트를 거부해서, 사용자가 직접 다시 설치해야 한다.
 *
 * 둘 다 minisign 형식을 base64로 한 번 더 감싼 글이다. 감싼 것을 풀면 두 번째 줄이 다시 base64이고, 그 바이트는
 * 공개 키: 알고리즘 2바이트 + 키 ID 8바이트 + 키 32바이트 (42바이트)
 * 서명: 알고리즘 2바이트 + 키 ID 8바이트 + 서명 64바이트 (74바이트)
 * 이다. 키 ID는 바이트 순서대로 소문자 hex로 돌려준다. 같은 형식끼리만 비교하므로 표시 순서는 상관없다.
 */

const KEY_ID = { start: 2, end: 10 };

function strictBase64(text: string): Buffer | null {
  const value = text.trim();
  if (value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value))
    return null;
  return Buffer.from(value, 'base64');
}

/** 감싼 base64를 풀고, 주석 줄 다음 줄의 minisign 바이트에서 키 ID를 읽는다. */
function keyId(wrapped: string, bytes: number, algorithms: string[]): string {
  const text = strictBase64(wrapped)?.toString('utf8');
  const lines = text?.split('\n') ?? [];
  if (!lines[0]?.startsWith('untrusted comment:'))
    throw new Error('minisign 주석 줄이 없어요');
  const raw = strictBase64(lines[1] ?? '');
  if (!raw || raw.length !== bytes || !algorithms.includes(raw.subarray(0, KEY_ID.start).toString('latin1')))
    throw new Error('minisign 바이트 형식이 아니에요');
  return raw.subarray(KEY_ID.start, KEY_ID.end).toString('hex');
}

/** tauri.conf.json의 plugins.updater.pubkey 값에서 키 ID를 읽는다. */
export function keyIdFromPublicKey(pubkeyBase64: string): string {
  return keyId(pubkeyBase64, 42, ['Ed']);
}

/** `tauri build`가 만든 .sig 파일 내용에서 키 ID를 읽는다. Ed는 그대로, ED는 미리 해시한 서명이다. */
export function keyIdFromSignature(sigFileContent: string): string {
  return keyId(sigFileContent, 74, ['Ed', 'ED']);
}

function tryRead(read: () => string): string | null {
  try {
    return read();
  }
  catch {
    return null;
  }
}

/** 문제가 없으면 빈 배열. */
export function checkSignatureKeys(pubkey: string, sigs: { name: string; content: string }[]): string[] {
  const expected = tryRead(() => keyIdFromPublicKey(pubkey));
  if (expected === null)
    return ['tauri.conf.json의 업데이트 공개 키(plugins.updater.pubkey)를 읽을 수 없어요 (REL-06)'];
  const problems: string[] = [];
  for (const sig of sigs) {
    const actual = tryRead(() => keyIdFromSignature(sig.content));
    if (actual === null)
      problems.push(`${sig.name}의 서명을 읽을 수 없어요 (REL-06)`);
    else if (actual !== expected)
      problems.push(`${sig.name}의 서명 키가 앱의 공개 키와 달라요. 출시용 키를 Secrets에 넣었는지, tauri.conf.json의 pubkey가 그 키인지 확인해 주세요 (REL-06)`);
  }
  return problems;
}
