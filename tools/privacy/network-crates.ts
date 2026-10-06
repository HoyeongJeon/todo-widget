/** HTTP 요청을 보낼 수 있는 crate와, 그것을 써도 되는 crate (PRIV-01). */
export const NETWORK_CRATES: Readonly<Record<string, readonly string[]>> = {
  reqwest: ['tauri-plugin-updater'],
  // reqwest가 쓰는 HTTP 바탕. reqwest 경로(그리고 TLS 연결 hyper-rustls) 말고 다른 crate가 쓰면 안 된다.
  hyper: ['hyper-rustls', 'hyper-util', 'reqwest'],
  'hyper-util': ['hyper-rustls', 'reqwest'],
  ureq: [],
  isahc: [],
  curl: [],
  attohttpc: [],
  minreq: [],
  tungstenite: [],
  'tokio-tungstenite': [],
};

/** `cargo tree -i <crate> -e normal --prefix depth` 출력에서 깊이 1(바로 위 의존자)의 crate 이름. */
export function directDependents(treeOutput: string): string[] {
  const names = treeOutput
    .split(/\r?\n/)
    .map((line) => /^1([\w-]+) v/.exec(line)?.[1])
    .filter((name): name is string => name !== undefined);
  return [...new Set(names)];
}

/** run(crate)는 그 crate의 역의존 트리 출력이고, 의존성에 없으면 null이다. 어긴 것을 문장으로 돌려준다. */
export function checkNetworkCrates(run: (crate: string) => string | null): string[] {
  const problems: string[] = [];
  for (const [crate, allowed] of Object.entries(NETWORK_CRATES)) {
    const tree = run(crate);
    if (tree === null)
      continue;
    if (allowed.length === 0) {
      problems.push(`${crate}가 의존성에 있어요 (PRIV-01)`);
      continue;
    }
    const users = directDependents(tree);
    if (users.length === 0) {
      problems.push(`${crate} 의존 트리를 읽지 못했어요 (cargo tree 출력 형식이 바뀌었을 수 있어요) (PRIV-01)`);
      continue;
    }
    for (const user of users.filter((name) => !allowed.includes(name)))
      problems.push(`${crate}를 ${user}가 써요. 네트워크는 ${allowed.join(', ')}만 써야 해요 (PRIV-01)`);
  }
  return problems;
}
