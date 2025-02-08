#!/usr/bin/env node

import { program, Command } from 'commander';
import path from 'path';
import { aggregateFiles } from './index.js';

const cli: Command = program
    .version('1.0.0')
    .description('Aggregate files into a single Markdown file')
    .option('-i, --input <paths...>', 'Input file/directory paths')
    .option('-o, --output <path>', 'Output file path', 'codebase.md')
    .option('--ignore-file <path>', 'Path to ignore file', '.aidigestignore')
    .option('--no-default-ignores', 'Disable default ignore patterns')
    .option('--whitespace-removal', 'Remove unnecessary whitespace')
    .option('--show-output-files', 'Show output files being processed')
    .option('--concurrent [number]', 'Number of concurrent file processing (default: 4)')
    .option('--dry-run', 'Show what would be done without making changes')
    .option('--verbose', 'Show debug-level logs')
    .action(async (options) => {
        const inputPaths = options.input || [process.cwd()];
        const outputFile = path.isAbsolute(options.output)
            ? options.output
            : path.join(process.cwd(), options.output);

        const ignoreFileAbsolute = path.isAbsolute(options.ignoreFile)
            ? options.ignoreFile
            : path.join(process.cwd(), options.ignoreFile);
        
        // Handle concurrent option cases
        let concurrentValue = undefined;
        if (options.concurrent === true) {
            concurrentValue = 4; // default when flag is used without value
        } else if (typeof options.concurrent === 'string') {
            concurrentValue = parseInt(options.concurrent, 10);
        }

        await aggregateFiles(
            inputPaths,
            outputFile,
            options.defaultIgnores,
            options.whitespaceRemoval,
            options.showOutputFiles,
            ignoreFileAbsolute,
            concurrentValue ?? false,
            options.dryRun,
            options.verbose
        );
    });

export default cli;

// Auto-execute if this is the entry point
if (import.meta.url === new URL(import.meta.resolve('./cli.js')).href) {
    cli.parse(process.argv);
}
