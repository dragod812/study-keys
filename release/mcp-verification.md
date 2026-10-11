# Study Keys 1.6.0 — MCP verification

Verified on 2026-10-11 using the unpacked extension in Google Chrome on macOS, the installed native companion, and fresh MCP clients over stdio. Changes are local; this report does not claim a Web Store submission.

## Implemented workflow

The one-time companion installer includes the MCP server and optional Codex, Cursor and Claude Desktop configuration. AI access is separately enabled in extension setup. The agent reads the requested rendered page, creates exact-quote highlights and notes, and appends native editable learning frames and diagrams to the **existing** Excalidraw notebook. Both human and agent changes use the same page folder and transaction path under `~/.study-keys`.

## Automated checks

- `npm test`: **82 passed**, including real MCP stdio → private Unix socket → native messaging framing → shared JavaScript service/repository → atomic Python folder storage. This transport test substitutes a fixture adapter only for the browser DOM.
- `npm run test:native`: **26 passed**, covering companion storage/recovery, MCP protocol/tool validation, optional client-configuration preservation and skill installation.
- `npm run package`: passed; produces `study-keys-chrome.zip` and the bundled companion installer.
- `git diff --check`: passed.

Regression coverage includes source/revision conflicts without partial saves, ambiguous passages, identical-request retries after process restart, manual-edit protection, targeted undo, retained element stacking order, canonical no-op saves, backups, long-label row spacing, disconnected duplicate tabs, top-frame messaging, unregistered live-editor refusal, and permission checks when queued commands begin.

## Installed Chrome + real MCP checks

| Surface / action | Observed result |
|---|---|
| Kueue overview | Four passage highlights and one question note appeared in the normal sidebar. Five learning frames and two diagrams were appended to the same notebook; the manually drawn rectangle and earlier annotations remained. The saved scene had 37 elements. |
| Kueue diagram rendering | MCP returned a PNG from the installed Excalidraw editor. All five frames were visually inspected for text containment, spacing and readable relationships. |
| Human/agent interoperability | A generated note was edited through the usual UI. A fresh MCP read saw the human addition. The note and all five layers survived extension/page reload. |
| Idempotent retry | Repeating the original Kueue batch from a fresh MCP client returned `replayed: true` without adding duplicates. |
| Local HTML | Read the rendered fixture, added annotations and a learning diagram, read back, and undid the test run. Earlier annotations/drawing were preserved and source bytes were unchanged. |
| Local Markdown with Markdown Viewer | Read the rendered file, added a passage highlight, note and learning diagram, rendered through Excalidraw, then undid the run. Original annotations and the complete original scene matched; source bytes were unchanged. An empty page title was initialized during the first agent write. |
| Hello Interview | A fresh tab successfully returned 18,303 characters of rendered text, six existing annotations and five existing drawing elements. This was a read check of the Introduction page, not proof of every membership page or disclosure type. |
| Access switch | Disabling AI access removed all browser endpoints from MCP status. Re-enabling restored the connection. Left enabled as authorized. |
| Final installed build | Reloaded 1.6.0 in Chrome, read and rendered the persisted Kueue study, and completed a disposable note save/undo. Readback confirmed existing annotations and drawing elements were unchanged. |
| Codex setup | `codex mcp get study-keys --json` confirmed the enabled stdio launcher. Re-running setup retained the existing registration. A new/reconnected Codex session is needed to load these tools. |

Local evidence is under the ignored `.preview/mcp/` and `.preview/evidence/` directories. The final sidebar screenshot is `mcp-1.6.0-final.jpg`; the rendered notebook is `kueue-final-notebook.png`. Test-only HTML/Markdown and final-smoke changes were undone. The useful Kueue learning content remains saved.

## Bundled Codex skill installation

The repository skill passed the skill-creator validator. The standalone installer was run against the live identical installation and reported `unchanged`. Automated tests verified fresh installation, customized-copy backup outside skill discovery, rollback after a failed replacement, symlink refusal, and Codex-only opt-in during companion setup. The actual generated companion ZIP was extracted into a temporary folder and its installer successfully installed the skill into a separate Codex directory from another working directory; a second run was a no-op. Both archive copies matched the repository skill. `--client codex` now installs the MCP registration and skill together; the skill-only installer leaves MCP configuration unchanged.

## Boundaries

- The MCP currently exposes page reading, annotations and drawings. Tab groups, jumplists and every navigation action are not yet MCP tools.
- Chrome must be connected for page/library editing and notebook rendering; basic status works without it. No TCP listener or generation service is added.
- Capture reads the rendered top document. It reports unavailable/collapsed content and excludes form fields; embedded frames and canvas-only text are unsupported. Native `details` sections can be expanded by an observed ID. A live read is not a complete website export.
- The calling agent supplies the teaching content. Exact source quotes and persistence are checked by the implementation; explanatory accuracy still requires agent review.
- The installed-client E2E checks used macOS Chrome and the stdio harness. Linux, Cursor and Claude Desktop UI sessions were not tested live; JSON configuration preservation has automated coverage.
- Cloud agents process the requested content through their own provider. Study Keys stores results locally and makes no separate model-service call.
