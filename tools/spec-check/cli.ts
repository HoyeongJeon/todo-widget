import { formatResult, runSpecCheck } from './check.ts';

const strict = process.argv.includes('--strict');
const result = runSpecCheck(process.cwd(), { strict });
console.log(formatResult(result, strict));
process.exitCode = result.exitCode;
