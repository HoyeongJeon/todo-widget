/** 맨 앞의 UTF-8 BOM 하나만 지운다. 두 번째부터는 내용이다 (STORE-19). */
export function stripBom(text: string): string {
  return text.startsWith('\uFEFF') ? text.slice(1) : text;
}
