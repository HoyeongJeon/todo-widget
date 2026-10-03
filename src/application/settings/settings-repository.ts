import type { FileStore } from '../ports/file-store.ts';
import { type WidgetSettings, decodeSettings, encodeSettings } from './settings-codec.ts';

export const SETTINGS_FILE = 'settings.json';

export class SettingsRepository {
  readonly #files: FileStore;
  #unknown: Readonly<Record<string, unknown>> = {};

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

  /** 읽지 못하면 기본값 (STORE-15). */
  async load(): Promise<WidgetSettings> {
    let text: string | null = null;
    try {
      text = await this.#files.read(SETTINGS_FILE);
    } catch {
      text = null;
    }
    const decoded = decodeSettings(text);
    this.#unknown = decoded.unknown;
    return decoded.settings;
  }

  /** 실패하면 false. 알리지 않는다 (STORE-17). */
  async save(settings: WidgetSettings): Promise<boolean> {
    try {
      await this.#files.writeAtomic(SETTINGS_FILE, encodeSettings(settings, this.#unknown));
      return true;
    } catch {
      return false;
    }
  }
}
