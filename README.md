# @slpixe/ai-md (JSR) | ai-txt (NPM)

A CLI tool to aggregate your codebase into a single Markdown file for easier review with AI models.

Available on:
- JSR: [jsr.io/@slpixe/ai-md](https://jsr.io/@slpixe/ai-md)
- NPM: [npmjs.com/package/ai-txt](https://www.npmjs.com/package/ai-txt)

## Overview

ai-md scans your project directory, applies default and custom ignore patterns, and merges files into a formatted Markdown output. It handles text, binary, and SVG files appropriately.

## Features

- Recursively aggregates files from folders.
- Supports default and custom ignore patterns.
- Optional whitespace removal (except for whitespace-dependent languages).
- Includes notes for binary and SVG files.
- Concurrency support for faster processing.

## Usage

You can run the CLI tool using these methods:

Using JSR (recommended):
```bash
# Using npx with JSR
npx jsr run @slpixe/ai-md

# Using JSR CLI directly
jsr run @slpixe/ai-md
```

Using npm:
```bash
# Run directly with NPM
npx ai-txt

# Install globally
npm install -g ai-txt
ai-md  # Command name remains ai-md for consistency
```

This generates a `codebase.md` file containing your aggregated codebase.

## Options

- `-i, --input <paths...>`: Input file(s) or directory(ies) (default: current directory)
- `-o, --output <file>`: Output Markdown file (default: codebase.md)
- `--no-default-ignores`: Disable default ignore patterns
- `--whitespace-removal`: Enable removal of excess whitespace
- `--show-output-files`: Display names of included files
- `--ignore-file <file>`: Specify a custom ignore file (default: .aidigestignore)
- `--ignore <pattern>`: Add ignore patterns via command line (can be used multiple times)
- `--concurrent`: Enable concurrency for file processing
- `--dry-run`: Perform a dry run without writing the output file
- `--help`: Show this help message

## Examples

1. Basic usage:

   ```bash
   # Using NPM package
   npx ai-txt
   
   # Using JSR package
   npx jsr run @slpixe/ai-md
   ```

2. With specific options and custom inputs:

   ```bash
   npx ai-md --whitespace-removal --show-output-files -i /src/Components -i README.md
   ```

3. Using CLI ignore patterns:

   ```bash
   # Ignore specific files and patterns
   npx ai-md --ignore "a.ts" --ignore "*.css" --ignore "./folder-b"
   
   # Combine with other ignore methods
   npx ai-md --ignore "*.test.ts" --ignore-file custom.ignore --no-default-ignores
   ```

## Ignore Patterns

You can specify patterns to exclude files and directories in multiple ways:

1. **Default Ignores**: Built-in patterns for common files to exclude (enabled by default, can be disabled with `--no-default-ignores`).

2. **Custom Ignore File**: Place a `.aidigestignore` file in your project root (or specify with `--ignore-file`). The syntax works similarly to `.gitignore`.

3. **CLI Ignore Patterns**: Use the `--ignore` option one or more times to specify patterns directly in the command. Supports file names, directory paths, and glob patterns:
   ```bash
   npx ai-md --ignore "*.test.ts" --ignore "./dist" --ignore "config.json"
   ```

## Whitespace Removal

When the `--whitespace-removal` flag is enabled, ai-md removes extra whitespace to reduce the token count for AI models. Note that files in whitespace-dependent languages (e.g., Python, YAML) are excluded from this process.

## Binary and SVG File Handling

Binary files and SVG images are included with a short note about their file type rather than full content, ensuring that file structure is maintained without unnecessary bulk.

## Development

- To run locally with full CLI options, use:
  ```bash
  npm run start
  ```

- If built (after `npm run build`), you can run:
  ```bash
  npx ai-md
  ```

- For local testing with a specific build directory and custom inputs, run:
  ```bash
  npx --prefix ~/{ai-md-directory} ai-md --whitespace-removal --show-output-files -i /src/Components -i README.md
  ```

- If you encounter permission issues, you might need to set execution permissions:
  ```bash
  chmod +x dist/index.js
  ```

- For testing, execute:
  ```bash
  npm test
  ```

- To build the project before publishing:
  ```bash
  npm run build
  ```

## Package Updates

For manual dependency updates:
```bash
# Check available updates
npx npm-check-updates

# Interactive mode (recommended)
npx npm-check-updates -i

# Update all dependencies
npx npm-check-updates -u && npm install
```

Alternatively, enable Renovate in your repository for automated dependency updates:
1. Install [Renovate App](https://github.com/apps/renovate) from GitHub Marketplace
2. Add to your repository
3. Renovate will automatically create a PR with its base configuration

## Deploy New Version

Deployments to both NPM and JSR are handled automatically via GitHub Actions when changes are pushed to the main/master branch.

## License

This project is licensed under the MIT License.
