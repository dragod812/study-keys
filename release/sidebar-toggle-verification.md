# Sidebar toggle fix — 1.6.1, 2026-10-11

Space h now toggles the notes sidebar rather than repeatedly requesting it open. Native visibility is tracked per browser window, including the browser close button, panel switches and reconnecting panel documents after a worker restart. Browsers without the native close/lifecycle APIs use the existing in-page drawer. Focus inside that drawer no longer blocks the shortcut. Native panel text fields retain ordinary typing; a pending note editor protects its draft from shortcut dismissal.

## Verification

- 92 JavaScript tests passed, including eight new sidebar tests for repeated toggles, window isolation, native close/toolbar state, worker reconnection, stale/untrusted ports, note-edit protection, in-flight operations, failures, older hosts and keyboard exclusions.
- Package build and git diff whitespace check passed.
- Installed Google Chrome extension reloaded from the existing dist folder; extension details confirmed 1.6.1 and Reloaded.
- Installed Chrome on a disposable original-content fixture: Space h opened the native panel, closed it on the second invocation, and reopened it on the third. Closing with Chrome’s × button and pressing Space h reopened it. Pressing Space h with focus on the panel heading also closed it.
- Typing Space h inside an unsaved note inserted the literal characters. Returning to the page and toggling did not discard the draft; the save/discard prompt appeared. After discarding this test-only draft, the shortcut closed the panel. No test note was saved to the library.
- Codex browser isolated preview: drawer counts were 1 → 0 on consecutive Space h sequences without a refocus click. × close → Space h reopened it. Search input retained the literal text test h and the drawer remained open.

Local build and installed Chrome are updated. GitHub main, the v1.6.1 release downloads and website are published. Both downloaded ZIPs match the release checksums. Google accepted 1.6.1 for review with automatic publication after approval; the superseded 1.6.0 review was canceled. Existing reading tabs must be refreshed when their unsaved website edits are safe.
