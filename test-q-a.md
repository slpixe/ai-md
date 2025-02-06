# Desired Functionality & Test Coverage Plan (With Checkboxes)

Below is a condensed summary of the desired functionality and recommended test coverage for this CLI tool, formatted as a to-do list for easy tracking.

---

## 1. Multiple Inputs

- **Current Behavior**
    - By default, if no `-i` is provided, it aggregates everything from the current directory (minus ignored files).
    - If `-i {file/folder}` flags are provided, only those files/folders (including subdirectories if folders) are aggregated.

- **Desired**
    - Same as current. Multiple `-i` entries should combine to include all specified files/folders.

- **Tests**
    - [ ] **No `-i`**: Verify it aggregates the current folder.
    - [ ] **Multiple `-i`**: Verify it combines the specified files/folders.
    - [ ] **Folder Skipping**: Create three directories and pass only two to `-i`. Confirm the third is not included.

---

## 2. Single Output File

- **Current/Desired**
    - Always outputs to one aggregated `.md` file (`codebase.md` by default, or user-specified `-o`).

- **Tests**
    - [ ] Verify the default output file is `codebase.md`.
    - [ ] Verify a custom output file (e.g., `-o custom.md`) is used instead when passed.

*(Likely already covered in existing tests.)*

---

## 3. Default Ignores

- **Current/Desired**
    - Use the existing default ignores (e.g., `node_modules`, lockfiles, etc.).
    - `.github` is not ignored by default (so it can be included if needed).

- **Tests**
    - [ ] Confirm at least one known default-ignored item (e.g., `node_modules`) is actually ignored by default.
    - [ ] Verify `--no-default-ignores` includes those items instead.

---

## 4. Single Custom Ignore File

- **Current/Desired**
    - One `.aidigestignore` file is used (unless `--no-default-ignores`).

- **Tests**
    - [ ] **File Present**: Verify `.aidigestignore` patterns are respected.
    - [ ] **File Missing**: Confirm the CLI logs a warning but still proceeds without crashing.

---

## 5. Whitespace Removal

- **Current**
    - Must use `--whitespace-removal`; it doesn’t remove whitespace from whitespace-dependent file types.

- **Desired**
    - Keep the current behavior for now (potentially reverse in the future).

- **Tests**
    - [ ] Verify that specifying `--whitespace-removal` *does* remove extra whitespace for non-whitespace-dependent files.
    - [ ] Verify that whitespace-dependent files (e.g., `.py`) remain unchanged.

*(Likely already tested, but good to confirm.)*

---

## 6. Binary & Large Files

- **Current**
    - Binary and SVG files appear with a short note (no content).
    - Text files over 5MB get skipped with a note: “(This text file is > 5 MB, skipping content.)”

- **Desired**
    - Keep this behavior. No partial chunking.

- **Tests**
    - [ ] **Mock Large Text File**: Use a fake or mocked `fs.stat()` to simulate >5MB, verify aggregator logs “skipping content.”
    - [ ] **Binary & SVG**: Already tested for short notes. Possibly add more coverage if needed.

---

## 7. Concurrency

- **Current**
    - `--concurrent` toggles concurrency (limited to 5 parallel tasks). Off by default.

- **Desired**
    - Keep concurrency off by default; let `--concurrent` enable it.

- **Tests**
    - [ ] **Enable `--concurrent`**: Compare final `codebase.md` to a non-concurrent run to ensure no corruption or missing files.

---

## 8. Dry-Run

- **Current**
    - `--dry-run` does everything except writing the final `.md` file. Logs all normal info.

- **Desired**
    - Same behavior.

- **Tests**
    - [ ] Verify that `--dry-run` does **not** create `codebase.md`.
    - [ ] Confirm logs still show file counts, token estimate (unless too large), etc.

---

## 9. Skipping Token Estimate for Large Output

- **Current/Desired**
    - If the final output file is >10MB, skip token counting and log a warning.

- **Tests**
    - [ ] **Mock Large Final Output**: Force final size >10MB and confirm it logs “skipping token count.”

---

## Additional Tests / Edge Cases

- [ ] **Token Counting**
    - Confirm a small text file’s output includes a valid token count.
    - Already covered for large output skip scenario.

- [ ] **Symlinks** (Optional)
    - Decide if you want to follow or skip them.
    - At least a basic test to see how `glob` behaves in your environment.

- [ ] **Special Characters in Filenames**
    - E.g. a file named `"file with space (#@!).js"` to confirm it is aggregated properly.

---

## Summary of Action Items

1. **Add or Update Tests**:
    - [ ] Concurrency (`--concurrent`)
    - [ ] Dry-Run (`--dry-run`)
    - [ ] Large Files (Mocked >5MB)
    - [ ] Multiple Directories
    - [ ] Symlinks (Optional)
    - [ ] Token Counting
    - [ ] Special Filenames
    - [ ] Missing `.aidigestignore`

2. **Keep Existing Behavior** for everything else.

This ensures comprehensive coverage of the clarified requirements and confirms no regressions in the tool’s core functionality.
