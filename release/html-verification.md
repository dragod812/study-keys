# Local HTML support — 1.5.2

Extends 1.5.1 local Markdown support to `.html` and `.htm` (case insensitive). Both use `pages/local-files/<filename>--<URL-hash>/`, per-file shortcut preferences, and the existing annotation/drawing/mark/search/workspace features. The source is never read by the helper or changed by Study Keys. Query strings and fragments share the same per-file annotation identity, as with Markdown. No additional Chrome permission was added beyond the existing, enabled file-URL access.

## Validation — 2026-10-11

- 70 JavaScript tests and 16 native helper tests passed. HTML coverage includes source preservation, restart and backup round trips, annotation/drawing/mark/workspace persistence, same-name isolation, and notebook session isolation. Unsupported and unsafe file URLs remain rejected.
- Built and packaged 1.5.2; installed the updated helper; reloaded the user's unpacked Chrome extension. Chrome displayed version 1.5.2 and enabled file-URL access.
- In a separate Chrome window, selected words via `v` labels on `fixtures/html/Study Keys Sample.html`; saved a yellow highlight and an attached note.
- Reloaded the document and verified the highlight and note in the sidebar with no missing-passage warning. Inserted a new paragraph through the fixture's button and confirmed the highlight remained attached.
- Typed navigation keys into a normal HTML text field; the complete text stayed in the field.
- Opened Excalidraw through `Space d n`, drew and labeled a rectangle, saved/closed, and reopened it. Verified the restored canvas visually and the rectangle/text elements in the saved `.excalidraw` file.
- Used the `s` picker to open a relative `.htm` link. `Space d s` found its “comet” heading and paragraph.
- The second HTML file had an empty annotation sidebar, confirming per-file isolation. Closed the disposable test window after verification.
- Source HTML SHA-256 remained `9e94cec01aef131864ea6bd8dcaf53d03dcddd242225f5f35810c537bd35f05d` after all annotation and drawing operations.

Local evidence: `.preview/evidence/html-1.5.2-highlight.jpg` and `html-1.5.2-notebook.jpg`. Test fixtures and evidence are excluded from the distributable ZIP. The source changes, package, helper, and Chrome installation are local; no Chrome Web Store submission occurred in this change.
