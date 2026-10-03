import { ALL_PREFIXES } from './config.ts';

export type Verify = 'auto' | 'manual';

export interface Requirement {
  id: string;
  title: string;
  file: string;
  line: number;
  verify: Verify | null;
  fields: Record<string, string>;
}

export interface SpecError {
  file: string;
  line: number;
  message: string;
}

const REQUIREMENT_HEADING = /^###\s+([A-Z][A-Z0-9]*-\d{2,3})\s+(\S.*?)\s*$/;
const ID_ONLY_HEADING = /^###\s+([A-Z][A-Z0-9]*-\d{2,3})\s*$/;
// 대문자 두 글자 이상으로 시작하는 단어 뒤에 숫자가 오면 요구사항을 쓰려던 것으로 본다.
const LOOKS_LIKE_REQUIREMENT = /^###\s+[A-Z]{2,}[A-Z0-9]*-?\d/;
const ANY_HEADING = /^#{1,6}\s/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const FIELD = /^-\s+(조건|동작|결과|확인):\s*(.*?)\s*$/;
const VERIFY_VALUES: Readonly<Record<string, Verify>> = { '자동 테스트': 'auto', '직접 확인': 'manual' };

export function parseSpec(
  markdown: string,
  file: string,
  prefixes: readonly string[] = ALL_PREFIXES,
): { requirements: Requirement[]; errors: SpecError[] } {
  const requirements: Requirement[] = [];
  const errors: SpecError[] = [];
  // 어느 수준의 제목이든 등록된 prefix 뒤에 '-'나 숫자가 오면 요구사항을 쓰려던 것으로 본다.
  const prefixedHeading = new RegExp(`^#{1,6}\\s+(?:${prefixes.join('|')})[-\\d]`);
  let current: Requirement | null = null;
  let fence: string | null = null;

  for (const [index, text] of markdown.replace(/^﻿/, '').split(/\r?\n/).entries()) {
    const line = index + 1;
    const at = (message: string): void => {
      errors.push({ file, line, message });
    };

    const fenceMatch = FENCE.exec(text);
    if (fence !== null) {
      if (fenceMatch && fenceMatch[1]![0] === fence[0] && fenceMatch[1]!.length >= fence.length
        && text.trim() === fenceMatch[1])
        fence = null;
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1]!;
      continue;
    }

    const heading = REQUIREMENT_HEADING.exec(text);
    if (heading) {
      current = { id: heading[1]!, title: heading[2]!, file, line, verify: null, fields: {} };
      requirements.push(current);
      continue;
    }
    if (ANY_HEADING.test(text)) {
      const idOnly = ID_ONLY_HEADING.exec(text);
      if (idOnly)
        at(`${idOnly[1]}에 제목이 없어요`);
      else if (LOOKS_LIKE_REQUIREMENT.test(text) || prefixedHeading.test(text))
        at(`요구사항 제목 형식이 아니에요: ${text}`);
      current = null;
      continue;
    }
    const field = FIELD.exec(text);
    if (current && field) {
      const [, name, value] = field as unknown as [string, string, string];
      if (name in current.fields) {
        at(`${current.id}에 ${name} 항목이 두 번 있어요`);
        continue;
      }
      current.fields[name] = value;
      if (name === '확인')
        current.verify = VERIFY_VALUES[value] ?? null;
    }
  }

  return { requirements, errors };
}
