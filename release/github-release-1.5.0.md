Study Keys 1.5.0 — Find your place

Search open tabs and their loaded passages, follow a reading jumplist, and save workspaces with groups and reading positions. Existing highlights, notes, drawings and marks remain local.

- `Space Enter`: fuzzy tab titles, URLs and groups; `Space p s`: passages across loaded tabs; `Space d s`: document passages; `/`: literal search.
- `Ctrl+O` / `Ctrl+I`: backward / forward through reading jumps. `]]` / `[[`: headings. `Space Space`: previous tab.
- `Space g`: tab groups; `Space w s` / `Space w o`: save / restore workspaces; `Space e a`: quick spots, reached with `Space 1` through `9`.
- Pin search results and traverse with `Space j` / `Space k`. Find unresolved Question annotations with `Space p q` and resolve them in the note editor.
- `Space s`: optional macOS integration for Chrome’s native vertical-tabs toggle. `Space h` remains page notes.
- Tabs left open during an extension update now offer an explicit reload-to-reconnect prompt, helping recover disconnected content scripts on sites such as Hello Interview.

This update adds the `tabs` and `tabGroups` permissions. Tab metadata and passage search are processed locally. The session jumplist disappears when the browser session ends; explicitly saved quick spots and workspaces are kept in `~/.study-keys` and included in backups. No cloud sync or analytics.

**Install/update:** extract `study-keys-chrome.zip` and load the folder in Chrome’s developer mode, or replace the files in your existing unpacked folder and reload that extension. Then reload reading tabs when your website edits are safe. Keep only one copy enabled per browser. Google’s review determines when the store version becomes available; see the [release status](https://github.com/dragod812/study-keys/blob/main/release/status.md).

**Required helper:** macOS/Linux, Chrome 131+, Python 3.11+ and Git. Update the helper using `study-keys-local-helper.zip` and the exact extension-ID command on the setup page. To opt into the native vertical-tabs action on macOS, append `--enable-vertical-tabs`, enable Chrome vertical tabs, and grant Chrome Accessibility access. The default setup does not enable this action. It is unavailable on Linux and in Codex’s browser.

**Validation:** 65 JavaScript tests and 14 native helper tests passed. Installed-Chrome checks covered search, cross-tab jumps, groups, duplicate-URL workspace restoration, quick spots, local persistence, native vertical tabs and Hello Interview. [Detailed evidence and limits](https://github.com/dragod812/study-keys/blob/main/release/navigation-verification.md).

Restricted browser pages, PDFs, embedded frames and canvas text remain outside scope. Passage search skips sleeping tabs and editors. This is a macOS/Linux beta; behavior on every website or browser configuration is not guaranteed.
