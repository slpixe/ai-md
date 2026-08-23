import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve(import.meta.dirname, '../../src/cli.ts');
const tsxImport = pathToFileURL(createRequire(import.meta.url).resolve('tsx')).href;

function splitArguments(args: string): string[] {
  return args.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((argument) => (
    argument.startsWith('"') && argument.endsWith('"')
      ? argument.slice(1, -1)
      : argument
  )) ?? [];
}

export async function runCli(cwd: string, args = ''): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(
    process.execPath,
    ['--import', tsxImport, cliPath, ...splitArguments(args)],
    { cwd, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  );
}
