import { beforeEach, describe, expect, it } from 'vitest';
import { FakeAutoStart } from '../testing/fake-auto-start.ts';
import { AutoStartControl } from './auto-start-control.ts';

let autoStart: FakeAutoStart;
let control: AutoStartControl;

beforeEach(() => {
  autoStart = new FakeAutoStart();
  control = new AutoStartControl(autoStart);
});

describe('⋯ 메뉴의 자동 실행', () => {
  it('START-04 체크 표시는 실제 등록 상태이고, 누르면 켜고 끈 뒤 다시 읽은 상태를 돌려준다', async () => {
    expect(await control.isEnabled()).toBe(false);
    expect(await control.toggle()).toBe(true);
    expect(autoStart.enabled).toBe(true);
    expect(await control.toggle()).toBe(false);
    expect(autoStart.calls).toEqual(['enable', 'disable']);
  });

  it('START-04 등록 여부를 읽지 못하면 꺼짐으로 보인다', async () => {
    autoStart.isEnabled = async () => {
      throw new Error('읽지 못함');
    };
    expect(await control.isEnabled()).toBe(false);
  });

  it('START-05 OS가 거부하면 안내를 켜고 실제 상태를 돌려주며, 다시 바꾸는 데 성공하면 안내를 끈다', async () => {
    let changes = 0;
    control.onChange(() => changes++);
    autoStart.failEnable = true;
    expect(await control.toggle()).toBe(false);
    expect(control.failed).toBe(true);

    autoStart.failEnable = false;
    expect(await control.toggle()).toBe(true);
    expect(control.failed).toBe(false);
    expect(changes).toBe(2);
  });
});
