import type { AppInfo } from '../../application/ports/app-info.ts';
import type { DesktopOs } from './coordinates.ts';
import type { Invoke } from './invoke.ts';

export interface PlatformInfo extends AppInfo {
  readonly os: DesktopOs;
}

/** Rust `app_info` 명령. 개발 빌드는 debug 빌드다(`pnpm tauri dev`, `--debug`) (START-07). */
export async function loadPlatformInfo(invoke: Invoke): Promise<PlatformInfo> {
  const info = (await invoke('app_info')) as { version: string; isDevBuild: boolean; os: string };
  if (info.os !== 'windows' && info.os !== 'macos')
    throw new Error(`지원하지 않는 OS예요: ${info.os}`);
  return { version: info.version, isDevBuild: info.isDevBuild, os: info.os };
}
