import type { WidgetSettings } from './settings-codec.ts';
import type { SettingsRepository } from './settings-repository.ts';

/**
 * 지금 설정. 바꾸면 바로 저장하고(WND-02, WND-09, LIST-09), 실패는 조용히 넘어간다(STORE-17).
 * 저장은 하나씩 차례로 하고, 늘 그 순간의 설정을 쓴다. 늦게 끝난 예전 저장이 새 설정을 덮지 않게 하려는 것이다.
 */
export class SettingsService {
  readonly #repo: SettingsRepository;
  #current: WidgetSettings;
  #queue: Promise<boolean> = Promise.resolve(true);

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

  /**
   * 저장 없이 바꾼다. 투명도를 끄는 동안처럼 나중에 한 번 저장할 때 쓴다 (WND-12).
   * 값이 undefined인 항목은 무시한다. 그대로 펼치면 그 항목이 저장 때 빠진다.
   */
  stage(patch: Partial<WidgetSettings>): void {
    const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    this.#current = { ...this.#current, ...defined };
  }

  /** 앞선 저장이 끝난 뒤, 그때의 설정을 저장한다. 실패하면 false. */
  save(): Promise<boolean> {
    const saved = this.#queue.catch(() => undefined).then(() => this.#repo.save(this.#current));
    this.#queue = saved;
    return saved;
  }
}
