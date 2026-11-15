# Document review cycle verification

Verified 2026-11-08 in the local Study Keys checkout. Changes are local and have not been published to the Chrome Web Store.

## Improvements

- Comments now have Delete in the sidebar, with `x` as the sidebar keyboard action and Undo delete for the last deletion during the reader session. Removing feedback excludes it from later prompts while preserving past handoff rounds. Save failures restore the comment.
- Compare changes offers Unstaged (index → working file), Staged (HEAD → index), and All uncommitted (HEAD → working file). Unstaged remains the default so accepting a round with `git add` clears its comparison. Staging through the reader returns to Unstaged.
- Git probes detect index and HEAD changes even when working-file bytes have not changed. External staging shows a refresh notice; Load latest updates the view without interrupting active selections or drafts.
- Referenced images use the correct index or HEAD version in staged comparisons. Comment navigation matches the source revision displayed in the selected comparison.
- Handoff reuse depends on open feedback and the loaded document revision. Deleting resolved feedback no longer creates a redundant handoff; previous prompts stay immutable.
- Leaving a draft updates the open sidebar's Resume comment draft control. The editor prevents typing from recreating a draft while its comment is being saved. Review actions are serialized so rapid clicks cannot duplicate an Undo.
- Older companions retain unstaged review and receive an update notice instead of displaying an incorrect staged baseline.

## Automated checks

`npm test`: 123 tests pass. The added UI lifecycle test drives the actual review UI against a simulated native transport: two selected passages, exact source lines, one combined prompt, repeat-copy reuse, resolved-feedback filtering, failed-delete rollback, rapid double Undo, immutable handoff history, external staging, staged/all comparisons, second-round feedback, single-file staging, and draft recovery/blocking. It also checks the editor lock while saving.

`npm run test:native`: 40 tests pass. Added coverage uses real disposable Git repositories for external staging across two rounds, correct HEAD/index/worktree image bytes, persisted comment deletion/restoration, and stale-tab rejection. Existing cases cover grants, source immutability, partial staging, unrelated-file preservation, untracked files, standalone documents, symlinks, limits and draft persistence.

`npm run build` succeeds; `git diff --check` is clean.

## Chrome observations

Used a separate Chrome window, the isolated development preview, a disposable `Review.md` Git repository, and the preview's dedicated library. The installed Web Store extension was placed in Insert mode for that page to avoid conflicting shortcut handlers. Real source files and production review records were not changed.

1. Pressed `c`, selected paragraph start/end labels, and saved two comments with Cmd+Enter. The editor showed exact source lines 3 and 5 and the selected quotations.
2. Copied one prompt containing both comment IDs, the absolute document path, line references, quotations and feedback. When the test window lacked clipboard focus, the prompt fallback displayed the complete saved prompt; after raising the window its Copy prompt action reported Copied.
3. Deleted the first comment and restored it through Undo delete. The sidebar counts and stored review followed both actions.
4. Simulated AI edits to both passages and chose Load latest. The reader displayed the original removed word and new additions.
5. Ran external `git add` on the fixture and loaded latest. The Unstaged view became clean. Switching to Staged displayed the accepted edits against HEAD.
6. Deleted both addressed comments, switched back to Unstaged, selected the updated paragraph and saved new feedback about retry limits. Copy handoff reported round 2 copied; the new prompt contained only the new feedback.
7. Simulated the second edit, loaded latest, then used Stage file. Changes only reported No unstaged changes in this document.

The browser exercised the review screen directly through the isolated preview; opening it with `Space r r` from a normal local-file tab was not retested in the updated packaged extension. The entry-point code is unchanged. The final save-lock/action-serialization and older-companion compatibility changes were verified by automated tests and build after the browser run.

## Delivery and limits

The build is in `dist/`. The existing Chrome installation is the Web Store version 1.7.1 and remains unchanged. Running the new staged comparisons in a packaged extension also requires updating its local companion from this build. No commit, push, store submission, or installation was performed.

A review covers one existing Markdown/HTML document. Stage file affects that document alone; staging all repository files remains a user Git operation. External staging requires Load latest to update the displayed baseline. Undo delete is session-local and restores the most recent deletion; saved handoff history still contains the original feedback. These checks do not claim full rendered-browser coverage for every media format or Git-conflict state.

## GitHub publication preparation — 2026-11-14

Rechecked the publication diff: all 123 JavaScript tests and 40 native tests pass; the extension build succeeds and git diff --check is clean. Updated the compatible transitive DOMPurify dependency from 3.4.16 to 3.4.18; npm audit reports zero vulnerabilities. Earlier Chrome observations above were not repeated in this pass.

The Herdr reviewer now lives in its own repository. Study Keys retains forwarding npm scripts and a README link; the older untracked prototype and its tests were backed up outside this checkout rather than published as a second implementation. Publication here means committing and pushing the source to GitHub; the Chrome Web Store package and installed extension remain at their existing release.
