# Desired Functionality & Test Coverage Plan

Below is a condensed summary of the desired functionality and recommended test coverage for this CLI tool.

---

## 1. Multiple Inputs

- **Current Behavior**:
    - By default, if no `-i` is provided, it aggregates everything from the current directory (minus ignored files).
    - If `-i {file/folder}` flags are provided, only those files/folders and their subcontents (if folders) are aggregated.
- **Desired**:
    - Same as current. Multiple `-i` entries should combine to include all specified files/folders.
- **Test**:
    1. **No `-i`**: ensures it aggregates the current folder.
    2. **Multiple `-i`**: ensures it combines the specified files/folders.
    3. **Folder skipping**: if there are three directories, and only two are specified, confirm the third is not included.

---

## 2. Single Output File

- **Current/Desired**:
    - Always outputs one aggregated `.md` file (`codebase.md` by default, or user-specified `-o`).
- **Test**:
    - Already covered (`codebase.md` vs. custom `-o`). No changes needed.

---

## 3. Default Ignores

- **Current/Desired**:
    - Use the existing default ignores. `.github` is not ignored by default so it’s included (CI/CD configs).
- **Test**:
    - Already tested via default behavior vs. `--no-default-ignores`.
    - Consider a test verifying that a known default-ignored file is indeed ignored.

---

## 4. Single Custom Ignore File

- **Current/Desired**:
    - Single `.aidigestignore` file is used, unless `--no-default-ignores`.
- **Test**:
    - Already partially covered.
    - Add a test for when `.aidigestignore` is **absent** (logs a warning, but still proceeds).

---

## 5. Whitespace Removal

- **Current**:
    - Controlled via `--whitespace-removal`; it does not affect whitespace-dependent file types.
- **Desired**:
    - Keep the current behavior. (Eventually may invert to remove whitespace by default.)
- **Test**:
    - Covered by existing test checking Python/YAML remain untouched.

---

## 6. Binary & Large Files

- **Current**:
    - Binary and SVG are noted with a short message; no content is shown.
    - Text files over 5 MB are skipped with a short note.
- **Desired**:
    - Keep exactly as is. No partial chunking.
- **Test**:
    1. Mock a text file >5 MB (e.g., fake `fs.stat()` or partial test file).
    2. Verify aggregator logs “(This text file is > 5 MB, skipping content.)”.

---

## 7. Concurrency

- **Current**:
    - `--concurrent` toggles concurrency, limited to 5 tasks at once. Off by default.
- **Desired**:
    - Keep concurrency off by default, optionally on with a limit.
- **Test**:
    - Enable `--concurrent` in a test and compare the final output to a non-concurrent run, ensuring no corruption.

---

## 8. Dry-Run

- **Current**:
    - `--dry-run` does everything except writing the final `.md` file. Shows logs and token counts normally (unless too large).
- **Desired**:
    - Same behavior.
- **Test**:
    - Confirm the CLI logs the summary and does **not** create `codebase.md`.

---

## 9. Skipping Token Estimate for Large Output

- **Current/Desired**:
    - If the final output is >10 MB, skip token counting and log a warning.
- **Test**:
    - Mock the final output size to exceed 10 MB and confirm the warning logs “skipping token count.”

---

## Additional Tests

1. **Multiple Directories**:
    - A scenario with 3 folders, only 2 specified in `-i`, verifying the 3rd is excluded.

2. **Symlinks**:
    - (Optional) to see how `glob` handles them. Decide whether to follow or ignore.

3. **Token Counting**:
    - Confirm a small text file produces a valid token count.
    - Confirm a large output triggers skip.

4. **Special Characters in Filenames**:
    - E.g. `"file with space (#@!).js"`, verifying it is processed/included.

5. **Missing `.aidigestignore`**:
    - Confirm the CLI logs a warning but doesn’t crash.

---

## Summary

1. **Implement New Tests**:
    - Concurrency (`--concurrent`), Large Files, Dry-Run, Multiple Directories, Symlinks, Token Counting, Special Filenames, Missing Ignore File.
2. **Maintain Existing Behavior** for everything else.

This ensures full coverage of your clarified requirements and confirms no regressions in the tool’s core functionality.
