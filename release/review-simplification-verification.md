# Simplified document review · 1.7.1

Verified October 21, 2026 (America/Los_Angeles). Release delivery is recorded separately in status.md.

## Automated checks

- 121 JavaScript tests pass. New coverage includes rendered word/block diffs, Markdown HTML sanitization, diagram/image replacement boundaries, source mapping across mixed old/new text, clean handoff prompts, exact reader scope, and highlight anchors that survive staging.
- 37 Python helper/installer/MCP tests pass. Review cases cover exact-file grants, changed/deleted sources without handoff blockers, single-file staging with unrelated staged and unstaged work preserved, no-op staging outside Git, index/worktree images, deleted and chunked images, and symlink rejection.
- Production ZIP builds successfully. It includes the local Mermaid renderer and updated companion; development fixtures/test storage are excluded.

## Browser checks

Used disposable Markdown/HTML fixtures in a temporary Git repository and a standalone Markdown file outside Git. The preview server restricts access to these named fixtures and uses separate test storage.

- Chrome keyboard: `v Space p`, start/end labels, color 1 and color 3, `c`, Ctrl+Enter. Comments point to source lines and quote current text without concatenating the deleted word.
- Changed the source after saving a comment, copied the handoff, and pasted the actual clipboard into a disposable editor. It contained the path, source lines, section, quote and feedback; no SHA verification, Git commands or staging instructions. The changed source did not block copying. Discarded that clipboard-check draft.
- Stage file UI staged only Review.md. Independently checked the index matches that file, while Other.md retained different staged and unstaged contents and a separate SVG remained unstaged.
- The standalone Markdown reader had no Changes only or Stage file control, no Git status/setup, and rendered Mermaid. Visual highlights persisted after reloading it.
- Codex browser: visually inspected green underlines, translucent red strikethrough, old/new Mermaid and inline SVG frames. Changes only retained rendered paragraph context and diagrams while excluding the unchanged heading. Embedded source scripts did not run.
- Installed the updated companion and reloaded the existing unpacked Chrome extension to 1.7.1. Opened its actual `chrome-extension:` reader on Report.html, granted this disposable source, and verified Mermaid/SVG rendering and source-linked comment persistence through the native helper.
- In the installed reader, highlighted a changed paragraph and pressed `Space r g`. The real index contained that HTML file; other files stayed untouched. The paragraph's yellow highlight remained visible after red comparison text disappeared. This catches the difference between merely saving a highlight and keeping its location after staging.

Evidence: docs/assets/review.png shows the rendered unstaged comparison. Additional installed-Chrome screenshots are local under .preview and excluded from the public package.

## Behavior and limits

Only index → working-file changes are displayed. Outside Git, reading, highlighting and comments work without Git controls or repository creation. Stage file stages all current changes to the selected document; it does not stage separate image files. Handoffs contain feedback and locations only. Internal content hashes remain for snapshot storage and anchor identity, not user-facing verification.

UTF-8 sources: 2 MiB. Referenced images: 8 MiB each. Mermaid is bundled and rendered locally; HTML scripts/styles do not execute. Remote image requests omit credentials/referrers and require the image server to permit fetching. Unavailable media shows its caption/source. The production npm advisory check passed with zero known vulnerabilities after an initial request timed out.
