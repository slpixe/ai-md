# Whitespace Removal Feature Plan

This document outlines the proposed changes to the CLI application's whitespace handling:

## Objective

- **Default Behavior:**  
  By default, the CLI will remove unnecessary whitespace during file aggregation.
  
- **Override with Flag:**  
  If the user provides the `-w` or `--keep-whitespace` flag, the CLI will preserve the whitespace.

## Proposed Changes

1. **CLI Option Modifications (src/cli.ts):**
   - Remove the existing `--whitespace-removal` flag.
   - Add a new option: `-w, --keep-whitespace` with the description "Keep whitespace (default trims whitespace)".
   - Update the call to `aggregateFiles` so that the parameter controlling whitespace removal is the inverse of the `keepWhitespace` flag.  
     (i.e., pass `!options.keepWhitespace` to `aggregateFiles`).

2. **Testing Enhancements (tests/whitespaceRemoval.test.ts):**
   - **Existing Test:**  
     Verify that with the default behavior (or using `--whitespace-removal` flag), the output indicates "Whitespace removal enabled (except for whitespace-dependent languages)".
     
   - **New Test:**  
     Add a test case to check that when the `-w` or `--keep-whitespace` flag is provided, the output indicates that whitespace is preserved.
   - Ensure these tests cover both scenarios without any negative effects on functionality.

## Next Steps

1. **Code Changes:**
   - Switch to Code mode to update `src/cli.ts` accordingly.
   - Update the option and parameter as described.
   
2. **Test Updates:**
   - Add a new test case in `tests/whitespaceRemoval.test.ts` for the `-w` flag.

3. **Validation:**
   - Run the test suite to ensure that both default behavior and the new whitespace preservation flag work as intended.

This plan ensures that the functionality is enhanced and validated with appropriate tests.