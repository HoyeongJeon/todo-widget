const ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-])(\d{2}):(\d{2})$/;
const V1 = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
const KST_OFFSET_MINUTES = 9 * 60;
const MAX_OFFSET_MINUTES = 14 * 60;

/** 한 시점과, 그 시점을 기록할 때의 시간대 오프셋(분). 초 아래는 버린다 (STORE-05). */
export class Timestamp {
  readonly #epochSeconds: number;
  readonly #offsetMinutes: number;

  private constructor(epochSeconds: number, offsetMinutes: number) {
    this.#epochSeconds = epochSeconds;
    this.#offsetMinutes = offsetMinutes;
  }

  static fromEpochMs(epochMs: number, offsetMinutes: number): Timestamp {
    return new Timestamp(Math.floor(epochMs / 1000), offsetMinutes);
  }

  /** `2026-10-03T15:00:00+02:00` 형식만 읽는다. 아니면 null (STORE-05). */
  static parse(text: string): Timestamp | null {
    const match = ISO.exec(text);
    if (!match)
      return null;
    const offsetMinutesPart = Number(match[9]);
    const offset = (match[7] === '-' ? -1 : 1) * (Number(match[8]) * 60 + offsetMinutesPart);
    if (offsetMinutesPart >= 60 || Math.abs(offset) > MAX_OFFSET_MINUTES)
      return null;
    const local = localSeconds(match);
    return local === null ? null : new Timestamp(local - offset * 60, offset);
  }

  /** v1.4의 `2026-09-30 14:05:00`을 한국 표준시로 읽는다 (STORE-12). */
  static parseV1(text: string): Timestamp | null {
    const match = V1.exec(text);
    if (!match)
      return null;
    const local = localSeconds(match);
    return local === null ? null : new Timestamp(local - KST_OFFSET_MINUTES * 60, KST_OFFSET_MINUTES);
  }

  get offsetMinutes(): number {
    return this.#offsetMinutes;
  }

  toEpochMs(): number {
    return this.#epochSeconds * 1000;
  }

  /** 실제 시각으로 비교한다. 시간대가 달라도 순서가 맞다 (LIST-04). */
  compare(other: Timestamp): number {
    return this.#epochSeconds - other.#epochSeconds;
  }

  format(): string {
    const { date, time } = fields(this.#epochSeconds, this.#offsetMinutes);
    const sign = this.#offsetMinutes < 0 ? '-' : '+';
    const abs = Math.abs(this.#offsetMinutes);
    return `${date}T${time}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  }

  /** 백업 파일 이름용 `yyyyMMdd-HHmmss`. 기록한 시간대의 시각이다 (STORE-08, STORE-12). */
  compactStamp(): string {
    const { date, time } = fields(this.#epochSeconds, this.#offsetMinutes);
    return `${date.replaceAll('-', '')}-${time.replaceAll(':', '')}`;
  }

  /** 주어진 시간대에서의 날짜 `yyyy-MM-dd` (STORE-06). */
  dateIn(offsetMinutes: number): string {
    return fields(this.#epochSeconds, offsetMinutes).date;
  }
}

/** 두 시각을 지금 PC 시간대로 바꿔 같은 날인지 본다 (STORE-06). */
export function isSameDay(a: Timestamp, b: Timestamp, offsetMinutes: number): boolean {
  return a.dateIn(offsetMinutes) === b.dateIn(offsetMinutes);
}

/** 정규식의 1~6번 그룹(연월일시분초)을 그 자리 시각의 초로 바꾼다. 없는 날짜·시각이면 null. */
function localSeconds(match: RegExpExecArray): number | null {
  const [year, month, day, hour, minute, second] = [1, 2, 3, 4, 5, 6].map((i) => Number(match[i]));
  const ms = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(ms);
  const same =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day &&
    check.getUTCHours() === hour &&
    check.getUTCMinutes() === minute &&
    check.getUTCSeconds() === second;
  return same ? ms / 1000 : null;
}

function fields(epochSeconds: number, offsetMinutes: number): { date: string; time: string } {
  const d = new Date((epochSeconds + offsetMinutes * 60) * 1000);
  return {
    date: `${String(d.getUTCFullYear()).padStart(4, '0')}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
