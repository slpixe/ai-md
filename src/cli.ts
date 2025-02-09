#!/usr/bin/env node
import { program, Command } from 'commander';
import path from 'path';
import { updateLoggerLevel } from './utils/logger.js';
import {aggregateFiles} from "./aggregator/aggregateFiles.js";

const cli: Command = program
    .version('1.0.0')
    .description('Aggregate files into a single Markdown file')
    .option('-i, --input <paths...>', 'Input file/directory paths')
    .option('-o, --output <path>', 'Output file path', 'codebase.md')
    .option('--ignore-file <path>', 'Path to ignore file', '.aidigestignore')
    .option('--ignore <pattern>', 'Additional ignore patterns (can be used multiple times)', (val: string, prev: string[]) => [...prev, val], [])
    .option('--no-default-ignores', 'Disable default ignore patterns')
    .option('--whitespace-removal', 'Remove unnecessary whitespace')
    .option('-f, --show-files', 'Show output files being processed')
    .option('-t, --show-tokens', 'Show token count analysis for each file')
    .option('-c, --concurrent [number]', 'Number of concurrent file processing (default: 4)')
    .option('-d, --dry-run', 'Show what would be done without making changes')
    .option('-v, --verbose', 'Show debug-level logs')
    .action(async (options) => {
        // Always call updateLoggerLevel with the verbose flag state
        updateLoggerLevel(!!options.verbose);

        const inputPaths = options.input || [process.cwd()];
        const outputFile = path.isAbsolute(options.output)
            ? options.output
            : path.join(process.cwd(), options.output);
        const ignoreFileAbsolute = path.isAbsolute(options.ignoreFile)
            ? options.ignoreFile
            : path.join(process.cwd(), options.ignoreFile);

        let concurrentValue: number | false = false;
        if (options.concurrent === true) {
            concurrentValue = 4;
        } else if (typeof options.concurrent === 'string') {
            concurrentValue = parseInt(options.concurrent, 10);
        }

        await aggregateFiles(
            inputPaths,
            outputFile,
            options.defaultIgnores,
            options.whitespaceRemoval,
            options.showFiles,
            ignoreFileAbsolute,
            concurrentValue ?? false,
            options.dryRun,
            options.ignore,
            options.showTokens
        );
    });

export default cli;

// Auto-execute if this is the entry point (handles both direct invocation and mod.ts import)
const currentFileUrl = new URL(import.meta.url);
const entryPoints = [
    new URL(import.meta.resolve('./cli.js')).href,
    new URL(import.meta.resolve('../mod.js')).href
];

if (entryPoints.includes(currentFileUrl.href)) {
    cli.parse(process.argv);
}
