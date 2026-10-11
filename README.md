# Study Keys

A local Chrome extension for reading, navigation, persistent highlights, notes and floating Excalidraw notebooks. macOS/Linux beta; a local folder helper is required to save your reading data.

## Use it

After installation, open **Set up local folder** from the extension popup and follow its helper setup steps. The beta requires macOS or Linux, Python 3.11+ and Git. For local development, load the generated `dist/` folder as an unpacked extension and keep it in place. Reload tabs that were already open when the extension was installed or updated. Use one Vim navigation extension at a time; Vimium and Study Keys both handle `v`, `f`, `j`, and other letter keys.

1. Press **v**. Every visible word receives a short label.
2. Type the label above the first word, then the label above the last word. The selection includes both complete words.
3. In **Visual mode**, press **h** for Highlight mode, **y** to copy, or **n** to attach a note. In **Highlight mode**, press **1–6** to save a color. **Shift+V** starts directly in Highlight mode; direct color keys in Visual mode also remain available. Save notes with **Cmd/Ctrl-Enter** or the visible Save button.
4. Press **Space h** to open Chrome’s native side panel. It shows the current page’s highlights and notes beside the article. Select a quotation to jump to it; edit a note directly in the panel.

The side panel follows the active tab. A draft stays attached to its original page while you edit. Finish or discard it before the panel follows another page. **All websites** opens a searchable library with color filters, reversible trash, JSON export and restore.

A text selection made with the mouse also accepts **1–6** or **n**. Existing pink Question highlights display in red; old backups remain compatible. Their stored color is updated when the page’s annotations are next saved, and new exports use red.

### Paragraphs, sections and the whole page

Press **v**, then **Space** to choose a selection scope:

- **p — Paragraphs:** type the starting paragraph's label, then the ending paragraph's label. Both complete paragraphs and everything between them are selected, in either direction. Choose the same label twice for one paragraph. Scroll with **↑/↓** or **Ctrl-d/u** between labels; the chosen start stays anchored. **j/k** then move to the next/previous paragraph; **Shift+J/K** extend the completed selection down/up.
- **s — Heading sections:** type a section label to select its heading, paragraphs and nested subsections, stopping before the next heading of equal or higher rank.
- **a — Whole page:** select all loaded readable text, including navigation and the footer.
- **w — Words:** return to start/end word labels.

Then press **y** to copy, **h** to highlight, or **n** to add a note. After choosing any passage, **p** expands it to complete paragraphs, **s** expands it to its enclosing section, and **a** selects the whole page. **Esc** closes the scope menu first, then the selection. Normal-mode shortcuts **Space v p**, **Space v s** and **Space v a** also open these scopes directly.

Copied text retains paragraph and line-break boundaries. Hidden text, editors, scripts and closed disclosure bodies are excluded; expand collapsed content or load additional content first. Whole-page selection follows live page updates until copied. Pages over the two-million-character indexing limit must be copied by smaller sections; large selections can be copied, while saved highlights/notes remain limited to 100,000 characters.

## Drawing notebooks

Press **Space d n**, or choose **Drawing notebook** from the extension popup, keyboard guide or page sidebar. Each webpage has its own Excalidraw canvas, saved on this device. The notebook floats above the article; it does not open a remote Excalidraw website.

- Drag the title bar or dotted handle to move. Drag near a screen edge or corner to snap there.
- Use **Dock notebook** to choose left/right/top/bottom, any corner, floating, or maximized. The square button and a title-bar double-click toggle maximize/restore.
- Resize from any edge or corner. For keyboard control, focus the dotted handle: **arrow keys move**, **Shift + arrow keys resize**. **Cmd/Ctrl-Shift-Enter** from the canvas focuses that handle; Tab reaches the docking menu and other buttons.
- Drawing tools keep Excalidraw's own keys (`r` rectangle, `a` arrow, `t` text, `v` selection). **Cmd/Ctrl-Enter** saves and closes. Escape stays with the drawing editor.
- **Fit drawing** brings the complete drawing into the resized window. Zoom and pan remain available inside Excalidraw.
- Changes save automatically after a short pause. Wait for **Saved to ~/.study-keys** before closing the tab. Save-and-close flushes pending edits, including text currently being edited.
- **Export .excalidraw** downloads an editable file. **Import** replaces this canvas; if it contains content, a copy is downloaded first. Images are embedded in the file, not fetched from other websites.

The last window position and size are remembered across pages and reloads. On an application that changes its URL without reloading, an open notebook stays attached to the page named in its title bar. Save and close it before opening the new page's notebook.

Drawings appear in **All websites** and are included in **Export backup**, alongside highlights and notes. Version 1 annotation backups and version 2 notebook backups still restore safely; version 3 also includes page and global marks. Conflicting drawing edits never silently replace another tab's saved scene: the draft is kept as a local recovery copy and can be exported. Individual scenes are limited to 20 MB; backup imports accept files up to 50 MB. Available disk space limits the local library.

## Vim modes and marks

The corner badge shows **NORMAL**, **VISUAL**, **HIGHLIGHT**, **MARK** or **INSERT**. Normal mode is the default. Press **v**, then type start/end word labels to select a passage. Visual mode lets you copy, annotate or change the selection. **h** opens Highlight mode with the six colors; **Shift+V** starts a new selection in Highlight mode. **Esc** returns from Highlight to Visual, then to Normal. While entering labels, Escape clears the typed prefix or backs out one stage. In **Insert mode**, every key—including Escape—goes to the website. **Ctrl+C** is the sole exit shortcut and returns to Normal, leaving a focused website field without changing its text. Cmd+C, modified shortcuts and IME remain untouched. Outside Insert mode, website editors keep their own keys.

Press **ma** to mark the current position on this page and **'a** (or backtick then a) to return. Any lowercase letter works. Press **mA** to save a global mark and **'A** to switch back from another page. Uppercase letters (Shift or Caps Lock) identify global marks. An existing tab for that URL is reused; if it is closed, Study Keys opens it. **Space m** searches the local and global marks.

Marks preserve horizontal and vertical scroll, including independent reading panes. Nearby text helps a mark follow the passage if content is inserted above it. Marks persist across reloads and browser restarts. A page must render its content for text-based restoration; use the jump again if a slow or virtualized page has not loaded the target yet. Reusing a letter replaces that mark.

## Shortcuts

| Keys | Action |
| --- | --- |
| `v` | Visual mode: label visible words; choose start, then end |
| `Shift+V` | Select directly into Highlight mode |
| `v`, then `Space`, then `p` / `s` / `a` | Label paragraphs / label heading sections / select the whole page |
| `Space v p` / `Space v s` / `Space v a` | Open paragraph / section / page selection from Normal mode |
| `p` / `s` / `a` after selecting | Expand to paragraphs / enclosing section / whole page |
| `j` / `k` with a paragraph selected | Next / previous paragraph |
| `Shift+J` / `Shift+K` with a paragraph selected | Extend down / up by one paragraph |
| `h` / `y` in Visual mode | Highlight the passage / copy it |
| `ma` / `'a` | Set / jump to page mark a (a–z) |
| `mA` / `'A` | Set / jump to global mark A across tabs (A–Z) |
| `Space m` | Search local and global marks |
| `1` / `2` / `3` / `4` / `5` / `6` | Yellow: Key idea / Blue: Key word / Green: Positives / Orange: Negatives / Purple: Game changer / Bright red: Question |
| `n` after selecting | Write a note on the passage |
| `e` / `o` after selecting | Change the end / start word |
| `Backspace` | Correct a partially typed label |
| `Esc` | Cancel the nearest selection stage or dialog |
| `↑` / `↓`, `Ctrl-d` / `Ctrl-u` while selecting | Scroll while retaining the selected start |
| `Space h` | Open the page’s annotation side panel |
| `[ h` / `] h` | Previous / next restored highlight |
| `Space n` | Add a page note without a text selection |
| `Space p f` | Search saved highlights and notes; filters `site:`, `color:`, `has:note`, `has:drawing` |
| `s` | Search links and controls; Ctrl-j/k or arrows, then Enter |
| `d` | Label visible links; type a label to copy its URL |
| `Shift+D` / `D` | Keep typing link labels to add unique URLs to one clipboard list, one per line; Escape finishes |
| `f` / `F` | Visible control hints / open a labeled link in a new tab |
| `o` / `O` | Open an HTTP(S) URL / open it in a new tab |
| `h j k l` | Scroll the active page or pane |
| `gg` / `G` | Top / bottom of the active page or pane |
| `Ctrl-d` / `Ctrl-u` | Half a page down / up |
| `/`, `n`, `N` | Literal text search, next occurrence, previous occurrence |
| `Space d n` | Open the floating Excalidraw notebook for this page |
| `Space d o` | Page heading outline |
| `Space d s` | Fuzzy passage search in the current document |
| `Space p l` | Resume the last search |
| `H` / `L` | Back / forward in tab history |
| `J` / `K` | Next / previous browser tab |
| `g0` / `g$` | First / last browser tab in the window |
| `gi` | Focus the first editable field |
| `yy` | Copy the current URL (where the browser permits clipboard writes) |
| `i` | Insert mode: pass keys through, including Escape |
| `Ctrl+C` in Insert mode | Return to Normal; leave the focused website field without changing its text |
| `?` | Searchable guide and persistent per-site enable setting |

New in the 1.5 navigation build:

| Keys | Action |
| --- | --- |
| `Space s` | Toggle **Chrome’s native vertical tabs**, using the optional macOS helper described below |
| `Space Enter` | Fuzzy search open-tab titles, URLs and group names |
| `Space p s` | Search passages in loaded tabs; `site:` and `group:` narrow the scope |
| `Space Space` | Return to the previous tab in this window |
| `Ctrl-o` / `Ctrl-i` | Older / newer reading position (physical Control on macOS) |
| `Space p j` | Search the session jumplist |
| `]]` / `[[` | Next / previous article heading |
| `3]]`, `5j`, `2Ctrl-o` | Counts in Normal mode; 1–6 still choose colors in Visual/Highlight mode |
| `zz` | Center the active passage |
| `Space g g / n / m / u / f` | Find groups / create / move selected browser tabs / ungroup / focus current group or restore |
| `Space e a / e` | Save a quick spot / choose or remove a saved spot |
| `Space 1…9` | Go to a quick spot |
| `Space j / k` | Next / previous result from a pinned search |
| `Space w s / o` | Save this window as a workspace / restore a workspace |
| `Space p q` | Search unresolved red Question annotations |

Use Chrome’s native multi-selection before grouping to act on multiple tabs. Group focus collapses other groups and scopes tab search; invoking it again restores the previous collapsed state. Workspaces reuse matching open URLs and restore positions as pages load. They do not close existing tabs. Notes and drawings remain keyed to their original page URLs. Quick spots and workspaces persist in `~/.study-keys/navigation/study.json` and are included in JSON backups. Opening the question’s annotation editor lets you mark it resolved without deleting the note.

Search results and the 100-entry reading jumplist are session-only. Cross-tab search inspects loaded readable text on demand, never wakes discarded tabs, and reports searchable coverage. It excludes inputs, closed disclosures, embedded frames, and sites where Study Keys is disabled. Tab titles can still be searched when page content is unavailable. No search index is written to your Git library. These navigation features are disabled in private windows.

**Optional native vertical-tabs toggle:** update the helper, then opt in with `python3 install.py --extension-id YOUR_EXTENSION_ID --enable-vertical-tabs`. On macOS, Chrome needs Accessibility access in System Settings. The fixed action operates only while Google Chrome is foreground and only clicks its native **Expand Tabs / Collapse Tabs** button; enable vertical tabs in Chrome first. It never falls back to opening the Study Keys notes panel. Linux and Codex’s in-app browser have no supported native toggle in this build. To disable the optional integration, remove `~/.study-keys/.integration/vertical-tabs-enabled`. The default helper setup does not enable this action.

On media websites, Normal-mode commands such as **Space**, **v → Space**, and **f** belong to Study Keys for the entire key press, including release. They do not also trigger the page’s playback or fullscreen shortcuts. To use website shortcuts, press **i** for Insert mode; **Ctrl+C** returns to Normal. Focused native media controls and website editors keep their own keys. **Reload existing tabs after updating** so the early keyboard handler is installed before site listeners.

`Space` shows an immediate command menu. Normal Tab navigation remains available. Inputs, editable regions, editor widgets, media controls, IME and Cmd/Alt shortcuts keep their native behavior. Inside a site-owned modal, Study Keys yields to the site.

## Local folder

**`~/.study-keys` is the default library**, and is initialized as a local Git repository. Each website has a folder; each page has a stable URL-based subfolder:

```text
~/.study-keys/
  pages/<website>/<page-path>--<URL-hash>/
    page.json
    annotations.json
    notes.md
    drawing.excalidraw
    drawing.json
    marks.json
    recovery/                 # only when needed
  global-marks.json
  settings.json
  window.json
```

Files appear when that kind of content is saved. `notes.md` is a generated, readable view; edit notes in Study Keys. `.excalidraw` files include images and can be opened externally. Reopen a notebook after external edits or a Git checkout. A stale open editor cannot silently overwrite the newer scene.

Chrome extensions cannot silently write arbitrary home-directory files. A small Python native messaging helper provides this access, restricted to the library folder and this extension's ID. It has no network or arbitrary command execution API. An optional macOS integration exposes one fixed action to expand/collapse Chrome’s native vertical tabs; it is off until explicitly enabled. Changes write to disk before reporting success; a browser cache remains for reading when the helper is unavailable. Existing browser records migrate once, without replacing existing disk records. Failed writes retain the editor's draft and show an error.

The helper and transaction journal are ignored by Git. No GitHub remote, automatic commits, or automatic pushes are configured. You can connect a private remote and commit the library yourself.

## Support and privacy

Publisher: Sidharth Padhee. [Support and bug reports](https://github.com/dragod812/study-keys/issues). [Privacy policy](https://dragod812.github.io/study-keys/privacy.html). Do not attach private library files to public issues.

## What is stored

Saved annotations, page drawing scenes (including embedded image bytes), drawing recovery copies, the notebook window layout, page/global scroll marks and per-origin shortcut preferences are stored. Each annotation has a URL, page title, exact normalized quotation, nearby text, color, optional note and timestamp. Unsaved note drafts are in memory until you save them.

The background service worker owns the native connection and **`chrome.storage.local`** cache. Website scripts cannot access the storage API or the annotation library. Nothing uses `storage.sync`, host-page localStorage, accounts, analytics, a local server or a cloud service. The development preview server is unrelated to the installed extension. All runtime code and fonts are bundled locally. Notebook network access is restricted to its own extension assets; there are no cloud saves, collaboration servers, analytics or remote font fallbacks. Its extension iframe requires a tab-bound session; the host website receives neither scene data nor library access. Visiting a URL through a navigation command naturally loads that website in Chrome.

Storage persists across page reloads, browser restarts and extension updates. **Uninstalling the extension or deleting the Chrome profile removes its browser cache; the `~/.study-keys` files remain.** Keep Git versions or exported backups to protect against accidental file deletion. JSON backups are plain text; store them somewhere appropriate for your notes. Restore validates the complete file before writing, merges by annotation ID and preserves newer edits. It does not duplicate an unchanged backup. Trash is reversible; no permanent-delete control is provided.

Writes are serialized across tabs. Conflicting edits to the same note are rejected while keeping the editor’s draft visible. Quota and storage errors are surfaced rather than reported as successful saves.

## Page compatibility

This release works on ordinary top-level HTTP and HTTPS HTML pages. It uses DOM ranges and the CSS Custom Highlight API, without wrapping or rewriting site text. Word labels sit in an isolated Shadow DOM. Chrome’s native side panel leaves the article viewport unobscured; an overlay fallback is available if the native panel cannot open.

Saved passages reattach using their quotation and surrounding context. Inline markup changes, inserted text and framework rerenders are supported. If a passage was removed, changed or is ambiguous, its annotation remains in the library and the side panel shows **Passage not found**. Opening a collapsed section may allow restoration. Overlapping highlights show the most recently edited annotation’s color in the overlapping area.

Current boundaries:

- Chrome internal pages, Chrome Web Store restrictions and the built-in PDF viewer cannot be annotated.
- Canvas-rendered documents, Google Docs editors, embedded frames, and text inside Shadow DOM components are not indexed in this release.
- A page that repeatedly replaces its text while you are selecting can cancel selection; start again against the current text.
- Virtualized content must be rendered on the page to receive labels or restore highlights.
- The first two million normalized characters of an exceptionally large page are indexed; a message appears when selecting beyond this limit.
- Hash routes beginning with `#/` or `#!` and meaningful query parameters are separate pages. Ordinary heading fragments and common tracking parameters are ignored. Other custom router schemes may need an adapter.
- This is a Vimium-style reading extension, not a complete implementation of every Vimium feature. Browser bookmarks/history search, keyboard macros and customizable mappings are not part of this release.

## Install locally / update

1. Extract **`study-keys-chrome.zip`** into a permanent folder.
2. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select that extracted folder (the folder containing `manifest.json`).
3. Open **Set up local folder** in the popup. Download and extract the helper, then run the command displayed there. It uses your actual extension ID and requires Python 3.11+ and Git. This registers the local helper and creates `~/.study-keys`.
4. Reload the pages you want to annotate. The library and sidebar show the local folder connection. Pin Study Keys from Chrome’s extension menu if desired.

For updates, replace the files in the same loaded folder and click **Reload** on its extension card. Keep the extension installed so its ID and storage remain the same. If moving to a different folder or profile, rerun the helper installer with the new extension ID; it reconnects to the existing local files. Export/import also remains available.

If a tab was open during an update, the badge changes to **Study Keys updated · Reload to reconnect**. Click it to reload when your website edits are safe. Study Keys leaves site keys alone while disconnected and retains saved annotations in the local library. Each browser has its own extension installation: updating Chrome does not reload the copy in Codex's browser. If no badge appears after reloading a page, check that browser's extension enablement and site access. Keep only one Study Keys copy enabled in each browser.

## Development

Requires Node 20+ and Chrome 131+ (Chrome desktop).

```sh
cd chrome-extension
npm ci
npm test
npm run test:native
npm run build
npm run package
```

`dist/` contains the extension and native helper installer (macOS/Linux, Python 3.11+). `npm run package` produces its installable ZIP. Neither the source tests nor test notes enter that package. Excalidraw, React, fonts and their licenses are bundled; dependency overrides pin patched transitive packages. `npm audit` reports zero vulnerabilities for this lockfile.

For isolated UI fixtures:

```sh
npm run preview
```

- `http://127.0.0.1:8788/` — documentation layout
- `http://127.0.0.1:8789/` — essay layout
- `http://127.0.0.1:8790/` — dynamic application with an independent scroll pane
- `http://127.0.0.1:8788/fixtures/media-shortcuts.html` — real local audio with competing page keyboard listeners
- `http://127.0.0.1:8788/fixtures/dom-tests.html` — browser DOM/range regression checks

The preview uses a separate local test repository under `.preview/`, not the extension’s production storage. Add `?installed=1` to a fixture URL when testing the actual installed extension; this omits the preview script. See **VERIFICATION.md** for observed results and limitations.

Background page updates preserve the current word-label prefix, selected start and selected passage. Labels track scrolling and layout movement without changing their codes. If the selected text itself disappears or cannot be identified safely after replacement, Study Keys asks you to select again.

### Copying links

In Normal mode, press `d` to label visible links directly on the page, just like `f`. Type a label to copy its full URL without opening it. No dialog or search box opens. `Shift+D` / `D` keeps the labels active and builds an ordered, deduplicated clipboard list, one URL per line. Copied links turn green with a checkmark. Escape finishes and leaves the list on your clipboard; another `D` session starts a fresh list.

Arrow keys or Ctrl-d/u scroll to more links while keeping the current list. Labels follow layout changes and keep their codes while their link remains unchanged. Hidden, obscured, collapsed, editor-owned, and executable pseudo-links are excluded. Clipboard failures leave the list intact and do not mark the failed link as copied. Full query strings and fragments are preserved.
