#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command, InvalidArgumentError } from 'commander';
import { aggregateFiles } from './aggregator/aggregateFiles.js';
import { MAX_CONCURRENCY, MAX_TOKEN_LIMIT } from './utils/constants.js';
import { configureLogger } from './utils/logger.js';
import { VERSION } from './version.js';

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_OUTPUT = 'codebase.md';

function parsePositiveInteger(value: string, label: string, maximum: number): number {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError(`${label} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new InvalidArgumentError(`${label} must be between 1 and ${maximum}.`);
  }

  return parsed;
}

function parseConcurrency(value: string): number {
  return parsePositiveInteger(value, 'Concurrency', MAX_CONCURRENCY);
}

function parseMaxTokens(value: string): number {
  return parsePositiveInteger(value, 'Maximum token count', MAX_TOKEN_LIMIT);
}

export function createCli(): Command {
  return new Command()
    .name('ai-md')
    .version(VERSION)
    .description('Aggregate files into a single Markdown file')
    .option('-i, --input <paths...>', 'Input file/directory paths')
    .option('-o, --output <path>', 'Output file path', DEFAULT_OUTPUT)
    .option('--stdout', 'Write only the generated Markdown to standard output')
    .option('--max-tokens <number>', `Maximum estimated tokens to include (max: ${MAX_TOKEN_LIMIT})`, parseMaxTokens)
    .option('--ignore-file <path>', 'Path to ignore file', '.aidigestignore')
    .option('--ignore <pattern>', 'Additional ignore patterns (can be used multiple times)', (val: string, prev: string[]) => [...prev, val], [])
    .option('--no-default-ignores', 'Disable default ignore patterns')
    .option('-w, --keep-whitespace', 'Keep whitespace (default trims whitespace)')
    .option('-f, --show-files', 'Show output files being processed')
    .option('-t, --show-tokens', 'Show token count analysis for each file')
    .option(
      '-c, --concurrent [number]',
      `Number of concurrent file-processing workers (default: ${DEFAULT_CONCURRENCY}, max: ${MAX_CONCURRENCY})`,
      parseConcurrency,
    )
    .option('-d, --dry-run', 'Show what would be done without making changes')
    .option('-v, --verbose', 'Show debug-level logs')
    .action(async (options) => {
      configureLogger(Boolean(options.verbose), Boolean(options.stdout));
      if (options.stdout && options.dryRun) {
        throw new InvalidArgumentError('--stdout cannot be combined with --dry-run.');
      }
      if (options.stdout && options.output !== DEFAULT_OUTPUT) {
        throw new InvalidArgumentError('--stdout cannot be combined with --output.');
      }

      const outputFile = path.resolve(options.output);
      const ignoreFilePath = path.resolve(options.ignoreFile);
      const concurrency = options.concurrent === true
        ? DEFAULT_CONCURRENCY
        : options.concurrent ?? 1;

      await aggregateFiles({
        inputPaths: options.input ?? [process.cwd()],
        outputFile,
        useDefaultIgnores: options.defaultIgnores,
        removeWhitespace: !options.keepWhitespace,
        showFiles: options.showFiles,
        ignoreFilePath,
        concurrency,
        dryRun: options.dryRun,
        ignorePatterns: options.ignore,
        showTokens: options.showTokens,
        stdout: options.stdout,
        maxTokens: options.maxTokens,
      });
    });
}

const cli: Command = createCli();

export async function runCli(argv: string[] = process.argv): Promise<void> {
  await cli.parseAsync(argv);
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  runCli().catch((error: unknown) => {
    if (error instanceof Error) console.error(error.message);
    process.exitCode = 1;
  });
}

export { aggregateFiles };
export default cli;
