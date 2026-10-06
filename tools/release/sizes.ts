export const INSTALLER_LIMIT_BYTES = 15 * 1024 * 1024;

export interface SizedFile {
  name: string;
  bytes: number;
}

const INSTALLERS = [
  { label: 'macOS dmg', match: (name: string) => name.endsWith('.dmg') },
  { label: 'Windows 설치 파일', match: (name: string) => name.endsWith('-setup.exe') },
];

/** 설치 파일 두 개가 있고 각각 기준 이하인지 본다 (PERF-05). */
export function checkInstallerSizes(files: readonly SizedFile[], limit = INSTALLER_LIMIT_BYTES): string[] {
  const problems: string[] = [];
  for (const installer of INSTALLERS) {
    const found = files.filter((file) => installer.match(file.name));
    if (found.length === 0)
      problems.push(`${installer.label}가 없어요 (PERF-05)`);
    for (const file of found.filter((f) => f.bytes > limit))
      problems.push(`${file.name}가 ${(file.bytes / 1024 / 1024).toFixed(1)}MB예요. ${limit / 1024 / 1024}MB 이하여야 해요 (PERF-05)`);
  }
  return problems;
}
