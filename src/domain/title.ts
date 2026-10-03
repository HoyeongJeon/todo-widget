// Unicode White_Space 전부(U+3000, U+0085 포함, U+FEFF 제외). String.prototype.trim은 U+FEFF도 지우므로 쓰지 않는다.
const WHITE_SPACE_RUN = /\p{White_Space}+/gu;
const EDGE_SPACE = /^ | $/g;

/** 정리된 할 일 제목. 빈 제목은 만들어지지 않는다 (TASK-03, TASK-04). */
export class Title {
  readonly #text: string;

  private constructor(text: string) {
    this.#text = text;
  }

  static parse(raw: string): Title | null {
    const text = raw.replace(WHITE_SPACE_RUN, ' ').replace(EDGE_SPACE, '');
    return text.length === 0 ? null : new Title(text);
  }

  get text(): string {
    return this.#text;
  }
}
