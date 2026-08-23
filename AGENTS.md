# Repository instructions

These instructions apply to the entire repository.

## Toolchain

- Use Node.js 24 for development. Keep compatibility with the supported range in `package.json`.
- Use the exact pnpm version declared in `packageManager` through Corepack.
- Use pnpm for dependency management and project scripts. Never create or commit `package-lock.json` or `yarn.lock`.
- Install dependencies with `pnpm install --frozen-lockfile` unless intentionally updating dependencies.
- Do not use `npx` in tests or development scripts; invoke locally installed tools with `pnpm exec`.

## Required checks

Before considering a change complete, run:

```bash
pnpm validate
pnpm pack --dry-run
```

Add or update tests for behavioral changes. Keep CLI tests offline and deterministic.

## Code and security

- Preserve the published npm package name `ai-txt`, the executable name `ai-md`, and the JSR package name `@slpixe/ai-md` unless a breaking migration is explicitly requested.
- Validate user-controlled paths, patterns, and numeric limits. Avoid shell interpolation and process-wide exits in reusable modules.
- Treat generated aggregate files as potentially sensitive. Never add credentials, tokens, private keys, or generated `codebase.md` files to commits.
- Keep default secret-file exclusions conservative and document any change that reduces them.
- Pin GitHub Actions to immutable commit SHAs and grant each job only the permissions it needs.
- Do not add long-lived publishing tokens. npm publishing uses GitHub OIDC trusted publishing; the release workflow's `npm publish` command is the intentional exception to pnpm-only project commands.

## Releases

- Start releases with the manual Prepare Release workflow. It opens a version pull request that must pass normal protected-branch checks.
- Publishing runs only after that version pull request is merged and the protected `release` environment is approved.
- Keep `package.json`, `jsr.json`, `src/version.ts`, and `pnpm-lock.yaml` synchronized when changing the version.
- Run a clean build before inspecting or publishing the package contents.
