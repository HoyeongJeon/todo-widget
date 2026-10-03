import type { WidgetSettings } from './settings-codec.ts';
import type { SettingsRepository } from './settings-repository.ts';

/** 지금 설정. 바꾸면 바로 저장하고(WND-02, WND-09, LIST-09), 실패는 조용히 넘어간다(STORE-17). */
export class SettingsService {
  readonly #repo: SettingsRepository;
  #current: WidgetSettings;

  private constructor(repo: SettingsRepository, current: WidgetSettings) {
    this.#repo = repo;
    this.#current = current;
  }

  static async open(repo: SettingsRepository): Promise<SettingsService> {
    return new SettingsService(repo, await repo.load());
  }

  get current(): WidgetSettings {
    return this.#current;
  }

  async update(patch: Partial<WidgetSettings>): Promise<void> {
    this.stage(patch);
    await this.save();
  }

  /** 저장 없이 바꾼다. 투명도를 끄는 동안처럼 나중에 한 번 저장할 때 쓴다 (WND-12). */
  stage(patch: Partial<WidgetSettings>): void {
    this.#current = { ...this.#current, ...patch };
  }

  save(): Promise<boolean> {
    return this.#repo.save(this.#current);
  }
}
