import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { endpointOverride } from './endpoint-config.ts';
import { makeLatestJson } from './latest-json.ts';
import { checkSignatureKeys } from './signature-key.ts';
import { checkInstallerSizes } from './sizes.ts';
import { checkVersions, readVersions } from './versions.ts';

const root = new URL('../../', import.meta.url);
const [command, ...args] = process.argv.slice(2);

function fail(problems: string[]): never {
  for (const problem of problems)
    console.error(problem);
  process.exit(1);
}

function only(dir: string, suffix: string): string {
  const names = readdirSync(dir).filter((name) => name.endsWith(suffix));
  if (names.length !== 1)
    fail([`${dir}에 ${suffix} 파일이 하나여야 해요 (${names.length}개) (REL-03)`]);
  return names[0] as string;
}

switch (command) {
  case 'versions': {
    const problems = checkVersions(readVersions((path) => readFileSync(new URL(path, root), 'utf8')), args[0]);
    if (problems.length > 0)
      fail(problems);
    console.log('버전 검사 통과');
    break;
  }
  case 'sizes': {
    const dir = args[0] ?? fail(['사용법: cli.ts sizes <dir>']);
    const files = readdirSync(dir).map((name) => ({ name, bytes: statSync(join(dir, name)).size }));
    const problems = checkInstallerSizes(files);
    if (problems.length > 0)
      fail(problems);
    for (const file of files)
      console.log(`${file.name} ${(file.bytes / 1024 / 1024).toFixed(2)}MB`);
    break;
  }
  case 'latest-json': {
    const [dir, repo, tag] = args;
    if (!dir || !repo || !tag)
      fail(['사용법: cli.ts latest-json <dir> <owner/repo> <tag>']);
    const version = tag.replace(/^v/, '');
    const mac = only(dir, '.app.tar.gz');
    const windows = only(dir, '-setup.exe');
    const macSig = { name: `${mac}.sig`, content: readFileSync(join(dir, `${mac}.sig`), 'utf8') };
    const windowsSig = { name: `${windows}.sig`, content: readFileSync(join(dir, `${windows}.sig`), 'utf8') };
    // Tauri CLI는 키가 달라도 경고만 한다. 다른 키로 서명한 Release는 설치한 위젯이 모두 거부하므로 여기서 막는다.
    const pubkey: string = JSON.parse(readFileSync(new URL('src-tauri/tauri.conf.json', root), 'utf8')).plugins.updater.pubkey;
    const keyProblems = checkSignatureKeys(pubkey, [macSig, windowsSig]);
    if (keyProblems.length > 0)
      fail(keyProblems);
    const json = makeLatestJson({
      version,
      notes: `TodoWidget ${version}`,
      pubDate: new Date().toISOString(),
      repo,
      tag,
      mac: { name: mac, signature: macSig.content },
      windows: { name: windows, signature: windowsSig.content },
    });
    writeFileSync(join(dir, 'latest.json'), `${JSON.stringify(json, null, 2)}\n`);
    console.log(`latest.json: ${mac}, ${windows}`);
    break;
  }
  case 'endpoint-config': {
    let config;
    try {
      config = endpointOverride(process.env.TODOWIDGET_UPDATE_ENDPOINT);
    }
    catch (error) {
      fail([(error as Error).message]);
    }
    if (!config)
      fail(['TODOWIDGET_UPDATE_ENDPOINT가 비어 있어요 (REL-10)']);
    console.log(JSON.stringify(config));
    break;
  }
  default:
    fail(['사용법: cli.ts versions [tag] | sizes <dir> | latest-json <dir> <owner/repo> <tag> | endpoint-config']);
}
