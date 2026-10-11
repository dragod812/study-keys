# Local Markdown support — 1.5.1

## Scope

Study Keys supports local `.md`, `.markdown`, `.mdown`, `.mkd` and `.mkdn` documents rendered directly in a Chrome tab, including Markdown Viewer. The extension only starts on supported Markdown file paths. It does not scan directories or fetch source files. Its native helper uses the URL solely as an identity and writes annotations, notes, drawings and marks inside `~/.study-keys/pages/local-files/`.

File paths stay distinct even when filenames match. Heading fragments and viewer cache queries do not split the library entry. Shortcut preferences are per file. Renaming or moving a source creates a different identity. Remote file hosts, arbitrary local file types, browser-internal pages and other extensions’ internal pages are excluded.

## Automated checks

- 69 JavaScript tests passed, including local URL identity, rejected file paths, independent file preferences, annotation/drawing/mark/workspace restart and backup round trips, cross-tab passage search, workspace restoration, local link copying, and notebook session isolation.
- 15 native helper tests passed. A real temporary Markdown source remained byte-for-byte unchanged after annotation/drawing saves; the separate library files survived helper restart.
- `npm audit --omit=dev`: zero known vulnerabilities.
- Build/package succeeded; Markdown test fixtures are excluded from the extension ZIP.
- `git diff --check`: clean.

## Browser verification

Verified on 2026-10-11 in Google Chrome with the installed Markdown Viewer, using the original sample fixtures in `fixtures/markdown/`:

- Reloaded the unpacked extension to 1.5.1 after the user approved local-file support; Chrome's file-access switch was already enabled.
- `Space` menu, fuzzy document search, `/` literal search, and `]]` section navigation worked on rendered Markdown.
- Selected “Quota keeps work bounded.” with start/end word labels and saved a yellow Key idea highlight. Added a note through the sidebar; both were restored after a full page reload, with no “Passage not found” state.
- Selected two paragraphs by start/end labels, copied with `y`, and verified the complete two-paragraph clipboard contents by pasting into an unsaved draft. Cleared and dismissed that draft.
- `d` copied the resolved local-file link. `Shift+F` plus its label opened the second Markdown fixture in a new tab.
- The second document had an empty annotation sidebar, proving the first document's notes were not shared with it.
- `Space p s` with `quasar site:local` found the second document; Enter switched to it. Ctrl+O and Ctrl+I returned between the two Markdown tabs.
- `Space d n` loaded Excalidraw on the local file. Created a rectangle with “Queue admission”, saved and closed, then reopened it. The shape and label were present visually and in `drawing.excalidraw`.
- Markdown Viewer's existing auto-reload setting was enabled. Temporarily inserted a paragraph before the highlighted text in the disposable fixture. The viewer redrew without a browser reload and the highlight reanchored correctly. Restored the fixture exactly.
- The setup page reported the connected local library and enabled local-file access.
- Rebuilt and reloaded the final package after clarifying the sidebar labels (“All pages” and per-Markdown-file shortcut scope). Reloaded the fixture again and verified the persisted highlight and note in the final sidebar.

The annotation and drawing files are in `~/.study-keys/pages/local-files/Study-Keys-Sample-md--e4a830475795/`. The fixture SHA-256 before saves and after exact restoration is `cc7539a74cd8030abb4f60d5024c01aba0125fcbcd3dcc160a657a63088e0458`. No private user Markdown was edited.

Local evidence: `.preview/evidence/markdown-1.5.1-highlight.jpg`, `markdown-1.5.1-notebook.jpg`, and `markdown-redraw-test.jpg`. These screenshots are not included in the extension package.

Limits: this verifies the installed Markdown Viewer on macOS Chrome, not every Markdown renderer or operating system. The 1.5.1 build has not been submitted to the Chrome Web Store as part of this change.

## Setup

Update the local helper, reload Study Keys, enable **Allow access to file URLs** in its Chrome extension details, and reload the Markdown document. Markdown Viewer needs its own file-access setting. The Study Keys setup page now reports file-access status and opens the correct extension details page.

## Sources

- [Markdown Viewer source](https://github.com/simov/markdown-viewer/blob/main/content/index.js): renders Markdown in the existing document body and supports redraws.
- [Chrome match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns): local-file matches require the user's separate file-access setting.
