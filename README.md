# ai-md

[![npm](https://img.shields.io/npm/v/ai-txt)](https://www.npmjs.com/package/ai-txt)

`ai-md` aggregates files into one Markdown document for review with AI tools. It applies default and custom ignore patterns, avoids embedding binary contents, can reduce whitespace, and can estimate token usage.

The project is published under different registry names for compatibility:

- npm package: [`ai-txt`](https://www.npmjs.com/package/ai-txt)
- installed command: `ai-md`
- JSR package: [`@slpixe/ai-md`](https://jsr.io/@slpixe/ai-md)

## Run it

Run the npm package without installing it:

```bash
pnpm dlx ai-txt
```

Or install the command globally:

```bash
pnpm add --global ai-txt
ai-md
```

Run the JSR package through its CLI:

```bash
pnpm dlx jsr run @slpixe/ai-md
```

By default, the command scans the current directory and writes `codebase.md`.

## Options

```text
-i, --input <paths...>     Input files, directories, or glob patterns
-o, --output <path>        Output path (default: codebase.md)
--ignore-file <path>       Ignore file (default: .aidigestignore)
--ignore <pattern>         Additional ignore pattern; may be repeated
--no-default-ignores       Disable built-in ignore patterns
-w, --keep-whitespace      Preserve original whitespace
-f, --show-files           List included files
-t, --show-tokens          Show per-file token estimates
-c, --concurrent [number] Process concurrently (default: 4, maximum: 64)
-d, --dry-run              Inspect the operation without writing output
-v, --verbose              Enable debug logging
```

Examples:

```bash
pnpm dlx ai-txt --show-files -i src README.md
pnpm dlx ai-txt --ignore "*.test.ts" --ignore "coverage/**"
pnpm dlx ai-txt --keep-whitespace --show-tokens --concurrent 8
```

## Ignored and sensitive files

Built-in ignores cover dependency directories, generated output, common caches, environment files, package-manager credentials, private-key formats, SSH/AWS credential directories, and similar files. Add project-specific patterns to `.aidigestignore` or with repeated `--ignore` flags.

Generated aggregates can still contain source code, configuration, personal information, or credentials stored under an unusual filename. Review `codebase.md` before uploading or sharing it. Use `--dry-run --show-files` to inspect the file list first. `--no-default-ignores` should be used only when you understand the disclosure risk.

Whitespace is reduced by default, except for configured whitespace-sensitive formats such as Python, YAML, Pug, Haml, and Godot scripts. Use `--keep-whitespace` to preserve all source formatting.

## Development

The required toolchain is Node.js 24 and the exact pnpm version declared in `package.json`:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm validate
```

Useful commands:

```bash
pnpm local-run       # run the source CLI against demo-folder
pnpm test            # run tests once
pnpm test:watch      # watch tests
pnpm test:coverage   # collect coverage
pnpm lint            # lint JavaScript and TypeScript
pnpm typecheck       # typecheck without emitting files
pnpm build           # compile to dist
pnpm pack --dry-run  # inspect the npm package contents
```

Tests invoke the repository's local `tsx` dependency and do not download executables at runtime. Contributor and agent rules are in [`AGENTS.md`](./AGENTS.md).

## Dependencies and releases

Renovate opens vulnerability fixes immediately, groups routine patch/minor updates weekly, and leaves major updates for explicit approval in the dependency dashboard.

Start a release with the manual **Prepare Release** GitHub Actions workflow. It opens a version pull request, which follows the normal required checks. After that PR is merged, the **Publish** workflow waits for approval from the protected `release` environment, creates the version tag, and publishes.

npm publishing uses OIDC trusted publishing with provenance; no long-lived npm token is required. Configure npm's trusted publisher for repository `slpixe/ai-md`, workflow filename `publish.yml`, and environment `release`. JSR trusted publishing must authorize `.github/workflows/publish.yml` as well.

## Security

See [`SECURITY.md`](./SECURITY.md) for private vulnerability reporting. GitHub Actions are pinned to immutable commits and use least-privilege job permissions.

## License

Licensed under the [MIT License](./LICENSE).
