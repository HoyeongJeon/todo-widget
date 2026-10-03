const VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/;

/** `candidate`가 `current`보다 높은 버전인지 (update.md 용어 "새 버전"). 형식이 다르면 새 버전이 아니다. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = parse(candidate);
  const b = parse(current);
  if (!a || !b)
    return false;
  for (let i = 0; i < 3; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y)
      return x > y;
  }
  return false;
}

function parse(version: string): number[] | null {
  const match = VERSION.exec(version.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}
