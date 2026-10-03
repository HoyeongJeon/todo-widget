import type { AutoStart } from '../application/ports/auto-start.ts';

/** 테스트용 자동 실행 등록. `gate`를 주면 그 약속이 끝날 때까지 켜기·끄기가 멈춰 있다. */
export class FakeAutoStart implements AutoStart {
  enabled = false;
  gate: Promise<void> | null = null;
  failEnable = false;
  failDisable = false;
  failRefresh = false;
  readonly calls: string[] = [];

  async isEnabled(): Promise<boolean> {
    return this.enabled;
  }

  async enable(): Promise<void> {
    this.calls.push('enable');
    if (this.gate)
      await this.gate;
    if (this.failEnable)
      throw new Error('OS가 등록을 거부했어요');
    this.enabled = true;
  }

  async disable(): Promise<void> {
    this.calls.push('disable');
    if (this.gate)
      await this.gate;
    if (this.failDisable)
      throw new Error('OS가 해제를 거부했어요');
    this.enabled = false;
  }

  async refresh(): Promise<void> {
    this.calls.push('refresh');
    if (this.failRefresh)
      throw new Error('경로를 갱신하지 못했어요');
  }
}
