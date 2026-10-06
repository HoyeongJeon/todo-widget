import { lineAt, type SourceFile, type Violation } from './rules.ts';

/** I18N-02 자동 검사 대상: presentation 층의 .svelte·.ts 제품 코드(테스트 파일은 collectSources가 뺀다). */
export const COPY_CHECK_DIR = 'src/presentation/';

/** 문구를 두는 곳이라 검사하지 않는 사전 파일. */
export const DICTIONARY_FILES: readonly string[] = [
  'src/presentation/i18n/ko.ts',
  'src/presentation/i18n/en.ts',
  'src/presentation/i18n/de.ts',
  'src/presentation/i18n/zh-hans.ts',
];

/** 값이 화면에 보이는(또는 화면 읽기 프로그램이 읽는) 템플릿 속성. 고정 글에 글자가 있으면 문구다. */
const VISIBLE_ATTRIBUTES: ReadonlySet<string> = new Set(['title', 'placeholder', 'aria-label', 'alt', 'label']);
/** 이 type의 `<input>`은 value가 버튼 글자로 보인다. */
const BUTTON_INPUT_TYPES: ReadonlySet<string> = new Set(['button', 'submit', 'reset']);

/** 글자(문자)가 하나라도 있는지. 기호(⋯ 📌 % · +)와 숫자는 글자가 아니다. */
const LETTER = /\p{L}/u;
/** ASCII 밖의 글자(한글, 한자, ä). 기술 문자열에는 쓰지 않으므로 늘 문구로 본다. */
const NON_ASCII_LETTER = /(?![\u0000-\u007f])\p{L}/u;
/** 공백 없는 기술 낱말: 이벤트·키 이름, 사전 키, 경로, CSS 값 하나, {n}. */
const TECHNICAL_TOKEN = /^[A-Za-z0-9_.:/#@%+{}()|-]*$/;
/** 소문자 낱말을 공백으로 이은 CSS 클래스 목록. 낱말마다 글자가 있어야 한다('3 tasks left'는 문구다). */
const CLASS_LIST = /^[a-z0-9_-]*[a-z][a-z0-9_-]*(?: [a-z0-9_-]*[a-z][a-z0-9_-]*)+$/;
/** 화면에 보이지 않는 개발자용 문장: console.*(…)와 new Error(…)의 첫 인자. */
const DEVELOPER_MESSAGE_BEFORE = /(?:\bconsole\.(?:error|warn|info|log|debug)|\bnew\s+Error)\(\s*$/;

/**
 * 문구로 보이는 문자열인지 (I18N-02, 설계 문서 7장의 예외 목록).
 * 예외: 글자가 없는 것, 공백 없는 기술 낱말, 소문자 CSS 클래스 목록. ASCII 밖의 글자가 있으면 늘 문구다.
 */
export function looksLikeCopy(value: string): boolean {
  if (!LETTER.test(value))
    return false;
  if (NON_ASCII_LETTER.test(value))
    return true;
  const trimmed = value.trim();
  return !TECHNICAL_TOKEN.test(trimmed) && !CLASS_LIST.test(trimmed);
}

/** presentation의 화면 문구가 사전 밖에 직접 쓰여 있는 곳 (I18N-02). */
export function checkCopy(files: readonly SourceFile[]): Violation[] {
  return files
    .filter((file) => file.path.startsWith(COPY_CHECK_DIR) && !DICTIONARY_FILES.includes(file.path))
    .flatMap((file) => (file.path.endsWith('.svelte') ? scanSvelte(file) : scanCode(file, 0, file.text.length)));
}

function violation(file: SourceFile, index: number, text: string): Violation {
  return { path: file.path, line: lineAt(file.text, index), message: `화면 문구는 사전에서 꺼내요 (I18N-02): ${text.trim()}` };
}

/** 줄 끝(다음 줄바꿈) 위치. */
function lineEnd(text: string, from: number, to: number): number {
  const end = text.indexOf('\n', from);
  return end < 0 || end > to ? to : end;
}

/** 따옴표 문자열의 닫는 따옴표 위치. 줄이 끝나면 거기서 멈춘다. */
function quoteEnd(text: string, open: number, to: number): number {
  const quote = text[open];
  let i = open + 1;
  while (i < to && text[i] !== quote && text[i] !== '\n') {
    if (text[i] === '\\')
      i++;
    i++;
  }
  return Math.min(i, to);
}

/**
 * 코드(.ts, <script>, 템플릿의 {…})에서 문자열 리터럴을 검사한다. 주석은 건너뛴다.
 * 한계: 정규식 리터럴 안의 따옴표는 문자열 시작으로 잘못 읽는다(presentation 코드에는 없다).
 */
function scanCode(file: SourceFile, from: number, to: number): Violation[] {
  const text = file.text;
  const found: Violation[] = [];
  let i = from;
  while (i < to) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '/' && next === '/') {
      i = lineEnd(text, i, to);
      continue;
    }
    if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 || end >= to ? to : end + 2;
      continue;
    }
    if (c === "'" || c === '"') {
      const end = quoteEnd(text, i, to);
      const value = text.slice(i + 1, end);
      const developer = DEVELOPER_MESSAGE_BEFORE.test(text.slice(Math.max(from, i - 40), i));
      if (!developer && looksLikeCopy(value))
        found.push(violation(file, i, value));
      i = end + 1;
      continue;
    }
    if (c === '`') {
      i = scanTemplate(file, i, to, found);
      continue;
    }
    i++;
  }
  return found;
}

/** `…${…}…`. 고정된 글 조각을 이어(값 자리는 `{n}`으로 둔다. `{`가 있어 CSS 클래스 목록으로 보지 않는다) 검사하고, ${…} 안의 코드는 scanCode로 본다. 닫는 ` 다음 위치를 돌려준다. */
function scanTemplate(file: SourceFile, open: number, to: number, found: Violation[]): number {
  const text = file.text;
  let i = open + 1;
  let chunk = '';
  while (i < to && text[i] !== '`') {
    if (text[i] === '\\') {
      chunk += text.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (text[i] === '$' && text[i + 1] === '{') {
      const close = braceEnd(text, i + 1, to);
      found.push(...scanCode(file, i + 2, close));
      chunk += '{n}';
      i = close + 1;
      continue;
    }
    chunk += text[i];
    i++;
  }
  if (looksLikeCopy(chunk))
    found.push(violation(file, open, chunk));
  return i + 1;
}

/** open 위치의 `{`에 맞는 `}` 위치. 문자열·템플릿·주석 안의 괄호는 세지 않는다. */
function braceEnd(text: string, open: number, to: number): number {
  let depth = 0;
  let i = open;
  while (i < to) {
    const c = text[i];
    if (c === "'" || c === '"') {
      i = quoteEnd(text, i, to) + 1;
      continue;
    }
    if (c === '`') {
      i = scanTemplate({ path: '', text }, i, to, []);
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      i = lineEnd(text, i, to);
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 || end >= to ? to : end + 2;
      continue;
    }
    if (c === '{')
      depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0)
        return i;
    }
    i++;
  }
  return to;
}

/** .svelte: <script>는 코드로, <style>과 <!-- -->는 건너뛰고, 템플릿은 글자·속성·{…}를 본다. */
function scanSvelte(file: SourceFile): Violation[] {
  const text = file.text;
  const found: Violation[] = [];
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      i = end < 0 ? text.length : end + 3;
      continue;
    }
    const block = /^<(script|style)\b[^>]*>/.exec(text.slice(i, i + 200));
    if (block) {
      const tag = block[1] ?? '';
      const bodyStart = i + block[0].length;
      const close = text.indexOf(`</${tag}>`, bodyStart);
      const bodyEnd = close < 0 ? text.length : close;
      if (tag === 'script')
        found.push(...scanCode(file, bodyStart, bodyEnd));
      i = close < 0 ? text.length : close + tag.length + 3;
      continue;
    }
    if (text[i] === '{') {
      const close = braceEnd(text, i, text.length);
      found.push(...scanCode(file, i + 1, close));
      i = close + 1;
      continue;
    }
    if (text[i] === '<') {
      i = scanTag(file, i, found);
      continue;
    }
    const start = i;
    while (i < text.length && text[i] !== '<' && text[i] !== '{')
      i++;
    const run = text.slice(start, i);
    // 템플릿 글자는 화면에 보인다. 기호·숫자가 아니면 모두 문구다.
    if (LETTER.test(run))
      found.push(violation(file, start + (run.length - run.trimStart().length), run));
  }
  return found;
}

/** 속성 이름에 따라 고정 글이 문구인지. 보이는 속성은 글자가 있으면, 그 밖의 aria-*는 문구처럼 보이면 문구다. */
function attributeIsCopy(name: string, literal: string): boolean {
  if (VISIBLE_ATTRIBUTES.has(name))
    return LETTER.test(literal);
  if (name.startsWith('aria-'))
    return looksLikeCopy(literal);
  return false;
}

/**
 * `<태그 …>`: 보이는 속성의 고정 글과 {…} 안의 코드를 검사하고, `>` 다음 위치를 돌려준다.
 * `<input>`의 value는 type이 버튼(button·submit·reset)일 때만 보이므로 태그를 다 읽은 뒤 본다.
 */
function scanTag(file: SourceFile, open: number, found: Violation[]): number {
  const text = file.text;
  let i = open + 1;
  while (i < text.length && !/[\s/>]/.test(text[i] ?? '>'))
    i++;
  const tag = text.slice(open + 1, i);
  let inputType = '';
  let inputValue: { index: number; literal: string } | undefined;
  while (i < text.length && text[i] !== '>') {
    const c = text[i] ?? '';
    if (/[\s/]/.test(c)) {
      i++;
      continue;
    }
    if (c === '{') {
      const close = braceEnd(text, i, text.length);
      found.push(...scanCode(file, i + 1, close));
      i = close + 1;
      continue;
    }
    const nameStart = i;
    while (i < text.length && !/[\s=>/]/.test(text[i] ?? '>'))
      i++;
    const name = text.slice(nameStart, i);
    if (text[i] !== '=')
      continue;
    i++;
    const valueStart = i;
    const quote = text[i];
    let literal: string;
    if (quote === '"' || quote === "'") {
      const value = scanAttributeValue(file, i, found);
      literal = value.literal;
      i = value.end;
    } else if (quote === '{') {
      const close = braceEnd(text, i, text.length);
      found.push(...scanCode(file, i + 1, close));
      literal = '';
      i = close + 1;
    } else {
      while (i < text.length && !/[\s>]/.test(text[i] ?? '>'))
        i++;
      literal = text.slice(valueStart, i);
    }
    if (attributeIsCopy(name, literal))
      found.push(violation(file, valueStart, literal));
    if (tag === 'input' && name === 'type')
      inputType = literal.trim();
    if (tag === 'input' && name === 'value')
      inputValue = { index: valueStart, literal };
  }
  if (inputValue && BUTTON_INPUT_TYPES.has(inputType) && LETTER.test(inputValue.literal))
    found.push(violation(file, inputValue.index, inputValue.literal));
  return i + 1;
}

/** 따옴표 속성 값. {…}는 코드로 검사하고, 남은 고정 글과 닫는 따옴표 다음 위치를 돌려준다. */
function scanAttributeValue(file: SourceFile, open: number, found: Violation[]): { end: number; literal: string } {
  const text = file.text;
  const quote = text[open];
  let i = open + 1;
  let literal = '';
  while (i < text.length && text[i] !== quote) {
    if (text[i] === '{') {
      const close = braceEnd(text, i, text.length);
      found.push(...scanCode(file, i + 1, close));
      i = close + 1;
      continue;
    }
    literal += text[i];
    i++;
  }
  return { end: i + 1, literal };
}
