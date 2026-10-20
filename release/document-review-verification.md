# Document review candidate · 1.7.0

Recorded October 20, 2026. Installed Chrome verification and the public release are pending.

## Automated verification

- 115 JavaScript tests pass, including revision comparisons, source mapping, shell quoting, partial staging, Ctrl+C versus Cmd+C, reader sender validation, canonical file identity, extension-reader/notebook message routing, and independent draft recovery.
- 33 Python helper/installer tests pass. Review cases cover exact-file grants/revocation, symlink and size rejection, source immutability, optimistic concurrency, immutable handoffs, restart recovery, CRLF/Unicode, untracked files, Git index preservation, and advancing the previous review baseline without overwriting unrelated staged work.
- Production dependency audit: zero known vulnerabilities.

## Browser workflow verified

The Codex browser ran the real content bundle with the preview transport connected to the real Python review store in `.preview/review-library`. Only the two original test documents in `.preview/review-fixtures` were accessible. This exercises the reading UI, filesystem persistence, source snapshots and real Git queries; it does not substitute for the remaining installed-extension transport check.

1. Granted the Markdown fixture, rendered headings, paragraphs, tables and fenced code.
2. Used `v Space p` and start/end labels to select two paragraphs; `c` opened feedback at source lines 7–9. Saved via the platform Enter chord.
3. Opened `Space r c` and used `y` to create a source-hashed, path-specific handoff. Verified the stored prompt, explicit Git path and stable comment ID in the local review JSON.
4. Simulated an agent edit. `Space r e` displayed additions/deletions against the original handoff. Selected a deleted paragraph and saved a second comment at its old source line and hash.
5. Reloaded the browser. Both comments and the handoff survived. Resolved the first comment; the second handoff included only the remaining feedback.
6. Simulated staging the reviewed fixture and making a new unstaged edit. The unstaged view showed only the new definition; the staged view showed the preceding two paragraph changes.
7. Rendered the HTML fixture, including expanded details. Its embedded script did not execute. Sentence labels selected inline-formatted text with a correctly labeled block location on source line 3.
8. Left an HTML comment unfinished, reloaded, resumed the recovered draft, and saved it.
9. Checked the reader and editor at a real 420-pixel frame viewport. Controls wrap and the comment editor remains usable. This is a responsive layout test, not support for arbitrary website frames in production.
10. Verified the saved handoff can be reopened as selectable text with copy/download controls. Corrected dark/light-theme contrast in the comments drawer and reserved desktop space so the document is not covered by it.

The browser tool translated Control shortcut requests into macOS Command accelerators. Its delivered event showed `metaKey: true`, `ctrlKey: false`. Command+Enter saved; Command+C retained copy behavior. Actual Ctrl+C is covered by regression tests but still needs a physical/installed-browser integration check. A temporary diagnostic banner was confined to `.preview/content.js` and removed; it is absent from production sources and packages.

The existing installed extension was put into Insert mode only on test tabs to prevent duplicate shortcut handlers. No real document, annotation library or user Git index was modified by these fixture tests.

## Remaining release gate

- Load the updated helper and extension with approved access only to the two test fixtures.
- Verify the packaged reader, plain local Markdown auto-render, native messaging grants, comment save/reload, clipboard contents, existing notebook/notes identity, tab navigation and Ctrl+C in installed Chrome.
- GitHub release and Pages deployment, then Chrome Web Store upload/submission. Google publication must be reported separately from submission.

## Intentional first-release limits

One document per handoff; UTF-8 regular files up to 2 MiB; symlink paths rejected. HTML uses a static safe reading view and provides an Original button for the original page. Some selections have block-level source attribution rather than an exact substring. Review JSON and raw snapshots need a folder backup; existing annotation JSON exports do not yet include them. Project-wide review batches, review-specific MCP tools, Markdown math and Mermaid are follow-on work.
