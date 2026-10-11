# Release 1.6.0 verification — 2026-10-11

## Automated and package checks

- `npm test`: 84 passed; `npm run test:native`: 26 passed.
- Real MCP stdio → private Unix socket → native messaging framing → shared JavaScript service/repository → atomic Python storage is covered, with a fixture browser adapter.
- `npm audit --omit=dev`: zero known vulnerabilities; `git diff --check`: passed.
- `npm run package`: passed. Extension ZIP has 475 files (16,262,104 bytes). Every packaged file matches the build; manifest/package versions are 1.6.0. No fixtures, private evidence, test state or personal library is included.
- Companion ZIP matches the nested download. Its extracted skill installer passed a fresh install and repeat/no-op from another working directory. Both skill files match source. Hashes are recorded in `SHA256SUMS-1.6.0.txt`.

## Codex browser regression pass

The release preview uses an isolated iframe so the previously installed extension does not consume the same test keys. Test writes use the ignored preview store, not the user's library.

- DOM fixture: 24 passed, zero failed.
- Reading alignment: 13 passed, zero failed; desktop and 430 × 800 layouts.
- Paragraph endpoint labels copied two complete paragraphs with the expected paragraph separator.
- Multi-link hints copied two unique URLs in chosen order, marking duplicate targets without duplicating the clipboard entry.
- With real local audio playing, Space, visual selection's Space menu and f did not reach competing page key handlers or pause playback. Insert mode passed Space through and paused the audio; Escape retained Insert mode.
- A page note survived reload and reopening the notes view.
- The Excalidraw notebook loaded, docked right, and retained a newly drawn rectangle after closing/reopening.
- Searchable help filtered paragraph commands; keyboard enable/disable controls remained operable.
- Compact controls fit the narrow viewport without horizontal overflow. Earlier 390 × 844 and 320 × 568 checks are in `compact-ui-verification.md`.

## Installed-browser coverage and limits

The earlier installed Chrome 1.6.0 pass verified local HTML/Markdown, live MCP highlights/notes/learn-by-layers frames, preservation of manual work, idempotent retry, undo, access revocation, diagram rendering and Hello Interview page reading. See `mcp-verification.md`, `html-verification.md` and `markdown-verification.md`.

The final compact-UI build was tested in the Codex browser preview. A fresh installed-Chrome UI pass could not finish because the native Chrome control interface timed out and its settings view was blank. MCP status still reported a connected 1.6.0 extension, but a fresh Kueue read returned the explicit site-access/reload error; this is not recorded as a successful live-page check. The unpacked extension and existing reading tabs need reloading.

Codex browser automation did not deliver Ctrl+C to the test page, so this pass does not claim a live Ctrl+C transition; automated key-ownership tests pass, and prior installed-browser checks covered that transition. No claim is made of perfect behavior on every website or of a fresh Linux GUI test.

## Publication checks

- GitHub release v1.6.0 contains both ZIPs and SHA256 sums. Both downloaded assets match the recorded hashes.
- GitHub Pages build/deployment succeeded and the live website displayed version 1.6.0 and the optional MCP/skill setup.
- Web Store Package displayed version 1.6.0. The new description, purpose, nativeMessaging/file access explanations and reviewer instructions were saved.
- Google confirmed **Pending Review** after submission with automatic publication enabled. This does not mean the public listing is live yet.
