import type { Requirement, SpecError } from './parse.ts';

export function validateRequirements(
  requirements: Requirement[],
  prefixesByFile: Readonly<Record<string, readonly string[]>>,
): SpecError[] {
  const errors: SpecError[] = [];
  const firstSeen = new Map<string, Requirement>();

  for (const req of requirements) {
    const at = (message: string): void => {
      errors.push({ file: req.file, line: req.line, message });
    };

    const first = firstSeen.get(req.id);
    if (first)
      at(`${req.id}이 중복돼요. 처음 나온 곳: ${first.file}:${first.line}`);
    else
      firstSeen.set(req.id, req);

    const allowed = prefixesByFile[req.file];
    const prefix = req.id.slice(0, req.id.lastIndexOf('-'));
    if (!allowed)
      at(`${req.id}: 요구사항을 둘 수 없는 파일이에요 (tools/spec-check/config.ts에 등록 필요)`);
    else if (!allowed.includes(prefix))
      at(`${req.id}은 이 파일에 둘 수 없어요. 쓸 수 있는 prefix: ${allowed.join(', ')}`);

    if (!req.fields['결과'])
      at(`${req.id}에 결과가 없어요`);

    const verify = req.fields['확인'];
    if (verify === undefined)
      at(`${req.id}에 확인이 없어요`);
    else if (req.verify === null)
      at(`${req.id}의 확인 값은 '자동 테스트' 또는 '직접 확인'이어야 해요: ${verify}`);
  }

  return errors;
}
