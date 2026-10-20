# Focus and media fixes — 1.6.2

Browser behavior verified October 19, 2026. All 104 JavaScript tests and 26 native-helper tests passed again on October 20. Publication progress is recorded in [release status](status.md).

## Published version

The signed-in Chrome Web Store developer dashboard reports **Published - public**, with **1.6.1** in its Published package table. This was checked directly after Google reauthentication.

## Changes

- Ctrl+C returns from a website input to Normal whether focus came from a click, gi, Tab, or explicit Insert mode. Draft text is preserved. The browser selection is cleared so a number immediately after exiting a Tab-selected input starts a command count instead of acting as a highlight color.
- gi / 2gi / 3gi focus fields in document order. gI labels visible fields; disabled, hidden, read-only and non-text inputs are excluded. Rich-text fields and open shadow-root fields are supported. Hints reserve room for the bottom help bar.
- Space p p plays or pauses one video/audio element on the current page. It favors an active audible player or the principal visible player over muted hover previews. It does not inspect other tabs or cross-origin frames.
- Shift and Caps Lock presses no longer cancel prefixes before uppercase commands.
- Overlay placement follows fullscreen players and website dialogs after an explicit Ctrl+C handoff. A removed site dialog returns the overlay to the document. Existing native input controls and Insert-mode pass-through remain intact.

## Verification

- 104 JavaScript tests passed, including field classification, exit-chord exclusions, media selection/actions, and complete keyboard-event ownership; existing annotation, notebook, MCP, storage, navigation and sidebar tests passed.
- Installed Chrome extension at ~/Code/study-keys/dist reloaded as 1.6.2.
- Real Chrome checks: click into an input, Ctrl+C, Normal navigation; textarea and rich-text drafts preserved; open shadow-root field focus and defocus; gi, numbered access, gI labels; native Tab/Shift+Tab; count navigation to a field below the fold immediately after Tab selected input text; Escape stays in Insert, Ctrl+C exits.
- Website modal: Ctrl+C hands control to Study Keys; gI labels inside the modal remain visible; typed modal draft survives handoff; closing the modal restores the overlay to the page.
- Controlled real-media fixture: Space, v Space, and f left site pause/fullscreen counters at zero across keydown/keypress/keyup. Space p p changed playback in both directions.
- Actual YouTube watch page in a separate Chrome test tab: gi focused search, Ctrl+C returned to Normal; Space p p paused/resumed; Space and visual scope/hint commands did not pause or enter fullscreen; fullscreen entered via an f label; the compact command menu remained visible; Space p p paused in fullscreen. Test tab was closed after restoring its audio setting. The user's original YouTube tab was not reloaded or edited.
- Codex browser: isolated preview fixtures verified field labels, media isolation and fullscreen overlay. Ctrl+C is not delivered to the page by this browser's automation, so that end-to-end check was completed in native Chrome instead.
- Narrow layout at 480 × 800: visible field labels and help bar remain within the viewport without labeling fields beneath the bar. Temporary viewport override reset afterward.

Two enabled unpacked Study Keys copies were observed in Chrome. Permission to disable the older copy remains unanswered, so neither was disabled. Both were reloaded from their shared dist folder for the Hello Interview retest. No test annotations were added to real articles and no drawing content was edited. Reading-navigation history was updated by the navigation checks.

The final package contains 475 files (16,266,366 bytes); its content.js matches dist/content.js byte for byte, and no fixtures, preview data or private evidence are included. SHA-256: `30cf06ae4c6034687d47845aeb8809c7b2f9a0f879466d29a25ea227b114c83f`. No extension permissions were added. Final Chrome smoke test after reloading the package passed input-selection handoff, counted field access, and playback in both directions. One initial load displayed “Request not available to page scripts” while both copies were enabled; duplicate/runtime cleanup remains pending confirmation.


## Hello Interview compatibility — October 19 follow-up

Reproduced a real failure in the installed extension after navigating from Introduction through How to Prepare to Bitly without reloading: `]]` reported the page-change error instead of moving to a section. The background compared requests with Chrome's original content-script sender URL, which can remain stale across client-side routes.

The background now validates requests against the exact sender document's live URL and Chrome's current tab URL. Notebook sessions and reading checkpoints use that validated URL. A different origin, replaced document, mismatched tab, stale article request, or unsupported file still fails closed. The next trusted keystroke also synchronizes the content script's article identity immediately instead of waiting for the periodic route check.

After installing the fix, the real Chrome journey passed:

- Bitly → Introduction through the Study Keys link picker; the original article's five saved annotations reappeared.
- `]]` section jumps and document-search jumps worked after the route transition; Ctrl+O / Ctrl+I remained available.
- The existing Introduction notebook rendered Excalidraw and reported local-folder storage after opening from the new route.
- Space h opened the five-annotation native side panel, then closed it from inside the panel and returned focus to the article.
- gi / 2gi, gI and Ctrl+C worked on the site's comment editor and comment search. The site's Cmd+K search could be opened, handed to Normal with Ctrl+C, refocused through a label, and closed with native Escape.
- Word start/end labels selected the exact phrase “Learn system design fast.”; all six semantic highlight colors appeared. Multi-paragraph start/end labels also produced the intended paragraph range without saving test annotations.
- The link/control picker opened Bitly's collapsed Hash Function explanation; newly expanded text became available.

Five focused URL-identity tests plus expanded background integration coverage verify that SPA notes, notebook saves, layout requests and reading checkpoints reach the second article while the first article's data remains separate. The complete suite passes 104 tests. The package's content and background bundles match dist byte for byte. No new permissions were added.

Real-site checks used Chrome's installed extension. Codex's separate browser session did not expose an active Study Keys overlay on a new Hello Interview tab; it was used only to inspect the page structure. Its existing local reader tab was left unchanged. Temporary testing tabs were closed. Private proof: hello-interview-selection-private.png (ignored by Git).
