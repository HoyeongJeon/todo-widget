export interface UpdaterFile {
  /** Release에 올라가는 파일 이름. */
  name: string;
  /** 같은 이름 + `.sig` 파일의 내용. */
  signature: string;
}

export interface LatestJsonInput {
  version: string;
  notes: string;
  /** RFC 3339 */
  pubDate: string;
  /** owner/repo */
  repo: string;
  tag: string;
  mac: UpdaterFile;
  windows: UpdaterFile;
}

interface PlatformEntry {
  signature: string;
  url: string;
}

export interface LatestJson {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<'darwin-aarch64' | 'darwin-x86_64' | 'windows-x86_64', PlatformEntry>;
}

/** tauri-plugin-updater가 읽는 latest.json (REL-03, UPD-02). macOS는 universal 하나가 두 CPU를 덮는다 (계획 6 D5). */
export function makeLatestJson(input: LatestJsonInput): LatestJson {
  const entry = (file: UpdaterFile): PlatformEntry => ({
    signature: file.signature.trim(),
    url: `https://github.com/${input.repo}/releases/download/${input.tag}/${encodeURIComponent(file.name)}`,
  });
  const mac = entry(input.mac);
  return {
    version: input.version,
    notes: input.notes,
    pub_date: input.pubDate,
    platforms: { 'darwin-aarch64': mac, 'darwin-x86_64': mac, 'windows-x86_64': entry(input.windows) },
  };
}
