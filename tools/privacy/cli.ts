import { spawnSync } from 'node:child_process';
import { checkNetworkCrates } from './network-crates.ts';

/** Rust 의존성 중 네트워크 crate를 검사한다. 이 OS의 빌드 대상 기준이라 CI가 Windows·macOS에서 각각 돌린다. */
const problems = checkNetworkCrates((crate) => {
  const result = spawnSync(
    'cargo',
    ['tree', '--manifest-path', 'src-tauri/Cargo.toml', '--workspace', '-i', crate, '-e', 'normal', '--prefix', 'depth'],
    { encoding: 'utf8' },
  );
  if (result.status === 0)
    return result.stdout;
  if (/did not match any packages/.test(result.stderr))
    return null;
  throw new Error(`cargo tree가 실패했어요: ${result.stderr}`);
});

if (problems.length > 0) {
  for (const problem of problems)
    console.error(problem);
  process.exit(1);
}
console.log('네트워크 crate 검사 통과');
