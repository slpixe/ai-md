# @slpixe/ai-md

A CLI tool to aggregate your codebase into a single Markdown file for easier review with AI models.

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
# Using npx
npx jsr run @slpixe/ai-md

# Using JSR CLI
jsr run @slpixe/ai-md
```

Using npm:
```bash
# Run directly
npx ai-md

# Install globally
npm install -g ai-md
```

After installation, you can run it anywhere with:
```bash
ai-md
```

This generates a `codebase.md` file containing your aggregated codebase.

## Options

- `-i, --input <paths...>`: Input file(s) or directory(ies) (default: current directory)
- `-o, --output <file>`: Output Markdown file (default: codebase.md)
- `--no-default-ignores`: Disable default ignore patterns
- `--whitespace-removal`: Enable removal of excess whitespace
- `--show-output-files`: Display names of included files
- `--ignore-file <file>`: Specify a custom ignore file (default: .aidigestignore)
- `--concurrent`: Enable concurrency for file processing
- `--dry-run`: Perform a dry run without writing the output file
- `--help`: Show this help message

## Examples

1. Basic usage:

   ```bash
   npx ai-md
   ```

2. With specific options and custom inputs:

   ```bash
   npx ai-md --whitespace-removal --show-output-files -i /src/Components -i README.md
   ```

## Custom Ignore Patterns

Place a `.aidigestignore` file in your project root to customize which files or directories to exclude. The syntax works similarly to `.gitignore`.

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

## Deploy New Version

You can publish to both npm and JSR:

For npm (as ai-md):
```bash
npm publish
```

For JSR (as @slpixe/ai-md):
```bash
# Using npx
npx jsr publish

# Using JSR cli
jsr publish
```

Make sure to update version numbers in both package.json and jsr.json before publishing.

## License

This project is licensed under the MIT License.