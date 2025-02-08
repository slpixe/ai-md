#!/usr/bin/env node

import { program, Command } from 'commander';
import path from 'path';
import { aggregateFiles } from './index.js';

const cli: Command = program
    .version('1.0.0')
    .description('Aggregate files into a single Markdown file')
    // ...existing commander options...
    .action(async (options) => {
        const inputPaths = options.input || [process.cwd()];
        const outputFile = path.isAbsolute(options.output)
            ? options.output
            : path.join(process.cwd(), options.output);

        const ignoreFileAbsolute = path.isAbsolute(options.ignoreFile)
            ? options.ignoreFile
            : path.join(process.cwd(), options.ignoreFile);

        await aggregateFiles(
            inputPaths,
            outputFile,
            options.defaultIgnores,
            options.whitespaceRemoval,
            options.showOutputFiles,
            ignoreFileAbsolute,
            options.concurrent,
            options.dryRun
        );
    });

export default cli;
