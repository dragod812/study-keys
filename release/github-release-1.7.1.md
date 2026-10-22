Study Keys 1.7.1 simplifies local document review.

- Agent handoffs contain your comments, file path, lines, sections and quoted passages. No SHA verification, Git commands or automatic-staging instructions.
- Inside Git, read unstaged changes directly: green underlines for additions and translucent red strikethrough for removals. Images, inline SVG and Mermaid stay rendered with old/new red/green frames.
- **Stage file** or **Space r g** stages only the open document. Separate images and other files remain unstaged.
- Outside Git, read, highlight and comment normally; no Git controls or setup.
- Visual highlights remain attached when staging removes the comparison text.

**Update the local helper** and reload the extension. Source access remains per-document and revocable. Source files are never edited by the reader. Remote images are fetched without cookies/referrers when their server permits it. Mermaid uses bundled local code.

Validated with 121 JavaScript tests, 37 helper tests, Codex browser layout checks and installed Chrome workflows. See [verification](https://github.com/dragod812/study-keys/blob/main/release/review-simplification-verification.md) for details and limits.
