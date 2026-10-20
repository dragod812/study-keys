Study Keys 1.6.2 makes it easier to move between website text fields, reading and video playback, and fixes navigation between Hello Interview articles.

- **Ctrl+C** leaves a website text field and returns to Normal without changing its draft.
- **gi / 2gi / 3gi** focus fields in document order, including below the fold. **gI** labels visible text fields so you can choose one directly.
- **Space p p** plays or pauses the current page's video or audio. Study Keys commands remain isolated from website playback shortcuts; menus and labels stay visible in fullscreen players.
- Article changes on Hello Interview keep section jumps, search, annotations and notebook requests connected to the correct page.

104 JavaScript tests and 26 native-helper tests pass. Installed-Chrome checks covered real YouTube playback/fullscreen, Hello Interview article transitions, fields, selections and the existing notebook. [Verification details and limits](https://github.com/dragod812/study-keys/blob/main/release/focus-media-verification.md).

No extension permissions or dependencies changed. The companion is unchanged from 1.6.0/1.6.1, so an existing helper installation does not need an update. Reload reading tabs when unsaved website edits are safe. The macOS/Linux beta requirements remain unchanged.

The Chrome Web Store update was submitted on October 20, 2026 and is pending Google review, with automatic publication after approval. Version 1.6.1 remains public until then. The GitHub package is available immediately; extract the extension ZIP and use Chrome's **Load unpacked** option to install it. Download hashes are in `SHA256SUMS-1.6.2.txt`.
