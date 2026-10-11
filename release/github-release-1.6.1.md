Study Keys 1.6.1 fixes `Space h` so it toggles the page notes sidebar open and closed.

- Tracks Chrome's native close button, toolbar opens and each browser window independently.
- Works while focus is inside the sidebar; normal text entry remains untouched.
- Protects an unfinished note from shortcut dismissal until saved or discarded.
- Uses the in-page notes drawer on browser hosts without the native panel close/lifecycle APIs, with the same toggle behavior.

92 JavaScript tests pass. Installed Chrome and Codex browser checks verified repeated toggles, × close/reopen, focus inside the sidebar and text-entry behavior. [Verification details](https://github.com/dragod812/study-keys/blob/main/release/sidebar-toggle-verification.md).

No permissions or dependencies changed. The local companion is unchanged from 1.6.0, so an existing 1.6.0 helper installation does not need an update. Reload reading tabs when unsaved website edits are safe. macOS/Linux beta requirements remain unchanged.

The Web Store update requires Google review; this GitHub download is available immediately.
