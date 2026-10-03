import type { FileStore } from '../ports/file-store.ts';
import { type WidgetSettings, decodeSettings, encodeSettings } from './settings-codec.ts';

export const SETTINGS_FILE = 'settings.json';

export class SettingsRepository {
  readonly #files: FileStore;
  #unknown: Readonly<Record<string, unknown>> = {};
  /** 있는데 읽지 못한 파일은 그 실행에서 덮어쓰지 않는다 (STORE-15). */
  #writable = true;

  constructor(files: FileStore) {
    this.#files = files;
  }

  /** settings.json이 있으면 처음 실행이 아니다 (START-02). 있는지 알 수 없으면 있다고 본다(꺼 둔 자동 실행을 다시 켜지 않으려고). */
  async exists(): Promise<boolean> {
    try {
      return await this.#files.exists(SETTINGS_FILE);
    } catch {
      return true;
    }
  }

  /** 읽지 못하면 기본값이고, 이 저장소로는 더 쓰지 않는다 (STORE-15). */
  async load(): Promise<WidgetSettings> {
    let text: string | null = null;
    try {
      text = await this.#files.read(SETTINGS_FILE);
    } catch {
      text = null;
      this.#writable = false;
    }
    const decoded = decodeSettings(text);
    this.#unknown = decoded.unknown;
    return decoded.settings;
  }

  /** 실패하거나 쓰지 않으면 false. 알리지 않는다 (STORE-15, STORE-17). */
  async save(settings: WidgetSettings): Promise<boolean> {
    if (!this.#writable)
      return false;
    try {
      await this.#files.writeAtomic(SETTINGS_FILE, encodeSettings(settings, this.#unknown));
      return true;
    } catch {
      return false;
    }
  }
}
