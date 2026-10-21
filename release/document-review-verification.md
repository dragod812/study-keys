# Document review candidate · 1.7.0

Recorded October 20, 2026. Automated, Codex preview and installed Chrome verification are complete for the workflows below. Release delivery is recorded separately from Google's approval.

## Automated verification

- 115 JavaScript tests pass, including revision comparisons, source mapping, shell quoting, partial staging, Ctrl+C versus Cmd+C, reader sender validation, canonical file identity, extension-reader/notebook message routing, and independent draft recovery.
- 33 Python helper/installer tests pass. Review cases cover exact-file grants/revocation, symlink and size rejection, source immutability, optimistic concurrency, immutable handoffs, restart recovery, CRLF/Unicode, untracked files, Git index preservation, and advancing the previous review baseline without overwriting unrelated staged work.
- Production dependency audit: zero known vulnerabilities.
- The installed companion files were updated and matched against the candidate sources. All 33 helper tests also passed with the installed Python 3.14.5 interpreter; the existing native-host extension registration was retained. Installed Chrome was subsequently reloaded to 1.7.0 and exercised the native connection.
- The draft release's extension/helper ZIPs were downloaded and verified against `SHA256SUMS-1.7.0.txt`.

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

The Codex browser tool translated Control shortcut requests into macOS Command accelerators. Its delivered event showed `metaKey: true`, `ctrlKey: false`. Command+Enter saved; Command+C retained copy behavior. The later native Chrome test verified actual Ctrl+C and Ctrl+Enter. A temporary diagnostic banner was confined to `.preview/content.js` and removed; it is absent from production sources and packages.

The existing installed extension was put into Insert mode only on test tabs to prevent duplicate shortcut handlers. No real document, annotation library or user Git index was modified by these fixture tests.

## Installed Chrome verification

The existing unpacked extension was reloaded from 1.6.2 to 1.7.0. These checks used its packaged `chrome-extension:` reader and the installed companion, not the preview transport. Source grants were limited to the two disposable Markdown/HTML fixtures.

1. Opened the original local Markdown file and used Space r r. Granted the exact source, then verified the packaged reader's headings, table and code block. The user's Markdown Viewer remained enabled on the original tab; this particular Chrome run does not isolate the plain-Markdown auto-render fallback from that extension.
2. Used paragraph endpoint labels to select two paragraphs and opened a comment at lines 9–11. Ctrl+C closed the editor, returned to Normal mode and kept the draft. Resumed it and used Ctrl+Enter to save.
3. Created a handoff, reloaded the reader, and verified the comment and handoff persisted in the native library. Pasted the actual clipboard into a disposable editor and checked the source hash, lines, quote and comment. The fixture had both staged and unstaged changes: the prompt correctly asked the agent to preserve the existing index instead of staging over it. Discarded the clipboard-check draft.
4. Opened Excalidraw from the packaged reader, imported a one-rectangle test drawing and saved it. Verified `drawing.excalidraw` contains the element under the original file's page directory.
5. Saved a page note from the review reader, opened Original in another tab and verified the same note in Chrome's native sidebar. Review JSON, notes and the drawing share the original `file:` identity.
6. Opened the HTML fixture through Space r r and granted only that file. Its original script replaces the original page body; in the review reader the script did not execute, the source headings and expanded details rendered, and sentence labels included text spanning inline formatting.

These checks supplement the two-round revision/diff tests above; they do not establish compatibility with every Markdown-viewer extension or every browser version. No personal document or user repository index was changed. Only disposable test annotations/drawings were added to the real library.

## Release delivery

- The 1.7.0 extension ZIP was accepted by the Web Store dashboard after canceling the older pending 1.6.2 review. The published store version remains 1.6.1 until Google approves a newer submission.
- Listing text, native-messaging justification, single-purpose description and reviewer setup instructions were updated for document review.
- GitHub release, Pages deployment and final Web Store submission are being completed. Submission is not approval or publication.

## Intentional first-release limits

One document per handoff; UTF-8 regular files up to 2 MiB; symlink paths rejected. HTML uses a static safe reading view and provides an Original button for the original page. Some selections have block-level source attribution rather than an exact substring. Review JSON and raw snapshots need a folder backup; existing annotation JSON exports do not yet include them. Project-wide review batches, review-specific MCP tools, Markdown math and Mermaid are follow-on work.
