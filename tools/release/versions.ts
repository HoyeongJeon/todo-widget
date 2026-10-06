export interface AppVersions {
  packageJson: string;
  tauriConf: string;
  cargoToml: string;
}

const CARGO_PACKAGE_VERSION = /^\[package\][^[]*?^version\s*=\s*"([^"]+)"/m;
const SEMVER = /^\d+\.\d+\.\d+$/;

/** read(path)는 저장소 루트 기준 파일 내용이다. */
export function readVersions(read: (path: string) => string): AppVersions {
  return {
    packageJson: String(JSON.parse(read('package.json')).version ?? ''),
    tauriConf: String(JSON.parse(read('src-tauri/tauri.conf.json')).version ?? ''),
    cargoToml: CARGO_PACKAGE_VERSION.exec(read('src-tauri/Cargo.toml'))?.[1] ?? '',
  };
}

/** 앱에 들어가는 세 버전과 태그가 같은지 본다 (REL-05). 문제를 문장으로 돌려준다. */
export function checkVersions(v: AppVersions, tag?: string): string[] {
  if (v.packageJson !== v.tauriConf || v.packageJson !== v.cargoToml)
    return [`앱 버전이 서로 달라요: package.json ${v.packageJson}, tauri.conf.json ${v.tauriConf}, Cargo.toml ${v.cargoToml} (REL-05)`];
  const version = v.packageJson;
  if (!SEMVER.test(version))
    return [`앱 버전 ${version}은 숫자.숫자.숫자 꼴이어야 해요 (REL-05)`];
  if (tag !== undefined && tag !== `v${version}`)
    return [`태그 ${tag}이 앱 버전 ${version}과 달라요. 태그는 v${version}이어야 해요 (REL-05)`];
  return [];
}
