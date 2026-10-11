# Chrome Web Store listing

Publisher: Sidharth Padhee
Visibility: Public
Category: Education
Language: English (United States)
Support: https://github.com/dragod812/study-keys/issues
Homepage: https://dragod812.github.io/study-keys/
Privacy: https://dragod812.github.io/study-keys/privacy.html

## Description

Study Keys turns reading on the web into a keyboard-driven study workflow: navigate, select passages, highlight, take notes, and draw beside the page.

macOS / Linux beta — a separate local helper is REQUIRED for saving. Requires Chrome 131+, Python 3.11+, and Git. The extension opens a setup page with the helper download and the exact installation command for your extension ID. Windows is not supported by this beta.

SELECT WITHOUT REACHING FOR THE MOUSE
Press v to show labels on visible words. Type a start label and an end label, then copy, highlight, or add a note. Use v → Space → p to select a range of paragraphs by its endpoints. The selection menu also supports heading sections and the loaded, readable page text.

COPY LINKS BY THEIR LABELS
Press d to label visible links directly on the page, then type a label to copy its full URL. Shift+D keeps the labels active and builds a clipboard list, one unique URL per line. Matching URLs share a green copied checkmark. Scroll to find more links; Escape finishes. No copy dialog opens.

HIGHLIGHT WITH A PURPOSE
Six colors have memorable meanings: yellow for Key idea, blue for Key word, green for Positives, orange for Negatives, purple for Game changer, and red for Question. Add your own explanation to a passage and revisit all of the page's highlights and notes in a sidebar.

DRAW NEXT TO THE IDEA
Each page can have an Excalidraw notebook. Float it, resize it, dock it to an edge or corner, or maximize it. Import and export .excalidraw files. Drawings and embedded images save locally with the page.

KEEP YOUR HANDS ON THE KEYS
Use Vim-style scrolling, link hints, page search, an outline, and tab navigation. Lowercase marks remember places on a page; uppercase marks travel across tabs. Normal, Visual, and Highlight modes have distinct jobs. Insert mode passes keys through to the website; Ctrl+C returns to Normal mode. Handled Study Keys commands also claim key release, preventing simultaneous playback or fullscreen shortcuts on media pages. Reload existing tabs after updating. Press ? for the keyboard guide. Use one Vim navigation extension at a time to avoid conflicting shortcuts.

FIND YOUR PLACE ACROSS TABS
Space Enter searches open-tab titles, URLs and group names. Space p s finds passages across loaded tabs; Space d s searches this document fuzzily and / searches literally. Ctrl+O and Ctrl+I move backward and forward through your session jumplist. ]] and [[ move between headings; Space Space returns to the previous tab.

KEEP A READING WORKSPACE
The Space g menu finds, creates and focuses tab groups or moves Chrome-selected tabs between them. Save quick spots with Space e a, return with Space 1 through 9, and save or restore a workspace with Space w s / Space w o. Workspaces preserve tabs, groups and reading positions without closing other tabs. Pin search results and move through them with Space j / Space k. Space p q finds unresolved Question annotations; resolve them in the note editor.

Space s toggles Chrome's native vertical tabs only with an optional macOS helper opt-in and Accessibility access. This fixed action is unavailable on Linux and in Codex's browser. Space h continues to open page notes. The default helper installation does not enable the native toggle.

YOUR LIBRARY, IN YOUR FOLDER
Highlights, notes, marks, drawings, quick spots and workspaces save in ~/.study-keys, organized by website and page. Chrome keeps a local cache. Export a backup or manage the folder with your own Git workflow. The helper initializes a local Git repository but never adds a remote, commits, or uploads your library. No Study Keys account, analytics, or cloud sync service is required or used.

BETA LIMITS
Chrome-internal pages, the built-in PDF viewer, embedded frames, closed shadow roots, and canvas-rendered text are outside the supported scope. Highlight restoration depends on finding the original text. The readable text index is capped at 2 million characters; a saved annotated passage is limited to 100,000 characters. When the helper is unavailable, cached notes remain readable and new saves report an error. Keep backups of your local folder.

Setup, helper downloads, privacy details and support:
https://dragod812.github.io/study-keys/

## Single purpose

Help users study web pages with keyboard navigation across reading tabs, local passage annotations, and page-linked drawing notebooks.

## Permission explanations

- storage: Save extension preferences, a local cache of the user's annotations and drawings, temporary notebook sessions, and a bounded session jumplist and search excerpts. No Chrome sync storage is used.
- unlimitedStorage: Keep image-containing Excalidraw notebooks and the user's local annotation cache without Chrome's small default local-storage quota.
- sidePanel: Display the current page's highlights and notes in Chrome's side panel when opened by the user.
- tabs: Read open-tab titles and URLs for the tab picker, target passage searches at loaded accessible tabs, and switch or restore reading tabs. No history API or scan of stored browsing history.
- tabGroups: Let the user create, find, focus and restore Chrome tab groups and move selected tabs between groups. Group metadata is processed locally and included in explicitly saved workspaces.
- nativeMessaging: Communicate only with the separately installed com.studykeys.local helper to save and restore the user's library in ~/.study-keys. An optional macOS opt-in performs one fixed action: click Chrome’s native vertical-tabs expand/collapse button while Chrome is foreground. It requires Accessibility access. The default installation does not enable it. The helper has no network or arbitrary command API. It accepts only explicitly registered extension IDs.
- HTTP/HTTPS content script matches: Read visible page text and controls for keyboard navigation, selection labels, restoring user-created highlights, and searching loaded passages. Text is processed on device; a bounded session jumplist and pinned search excerpts stay in session storage. Explicitly saved annotations, page identifiers, marks, drawings, quick spots and workspaces stay in the local library.
- Remote code: None. JavaScript, Excalidraw, and fonts are bundled. No remotely hosted executable code is loaded.

## Reviewer setup

This beta requires macOS or Linux, Chrome 131+, Python 3.11+, and Git. No login or paid account is required. The native helper is included as study-keys-local-helper.zip in the extension; it is also available from the GitHub release.

1. Install the extension and open its setup page (toolbar popup → Set up local folder).
2. Download and extract the helper ZIP.
3. Run the exact python3 install.py --extension-id COMMAND_SHOWN_IN_SETUP command in the extracted directory. The setup page supplies the real ID. The installer creates ~/.study-keys and registers com.studykeys.local for that ID.
4. Click Check connection; it should show Connected.
5. Open https://dragod812.github.io/study-keys/demo.html. Press v, choose two word labels, press h, then 1. Reload; the highlight should return.
6. Press v → Space → p, choose start/end paragraph labels, then n. Enter a note and save. Space h opens page notes.
7. Space d n opens the notebook. Draw a shape, close with Cmd/Ctrl+Enter, and reopen. Resize and dock from its window controls.
8. Press i: normal website input, including Escape, is untouched. Ctrl+C returns to Normal.
9. mA sets a global page mark; 'A from another tab returns to it. ma / 'a are local marks.
10. The library page offers JSON backup/import and Trash recovery. Private browsing and restricted Chrome pages are not part of this beta.

11. On https://dragod812.github.io/study-keys/, press d and type a link label to copy its URL. Shift+D keeps labels visible for multiple selections; paste into a text editor to verify one unique URL per line. Matching URLs share green copied checkmarks. Escape finishes.

12. On a media page after a full reload, with focus outside the native player or an editor, Space opens the Study Keys menu, v → Space opens selection scopes, and f opens hints without also activating the page shortcuts. Press i to use the website’s global playback keys; Ctrl+C returns to Normal. Focused native media controls still own their keys.

13. Open the demo and another ordinary web page. Space Enter searches tab titles; Space p s searches loaded passages. Space d s searches this page fuzzily; / uses literal search. Choose results and use Ctrl+O / Ctrl+I to traverse the reading jumps. ]] / [[ move between headings.
14. Use Chrome's native tab multi-selection, then Space g n to create a named group or Space g m to move selected tabs. Space g f focuses/restores a group. Space w s saves the current window and Space w o restores it without closing other tabs. Space e a saves a quick spot; Space 1 returns to the first spot. These records save in ~/.study-keys/navigation/study.json.
15. Save a red Question annotation and find it with Space p q. Mark it resolved in its editor; it should leave unresolved results and remain in the library. Search results can be pinned and revisited with Space j / Space k.
16. Optional macOS-only vertical-tabs test: rerun the helper installer with --enable-vertical-tabs appended, grant Chrome Accessibility access, and enable vertical tabs in Chrome. With Chrome foreground, Space s toggles its native Expand Tabs / Collapse Tabs control. Linux and Codex do not support this optional action. Space h opens Study Keys notes regardless.
17. Reload the extension while a reading tab remains open. Its disconnected badge offers an explicit page reload. Reload when website edits are safe; the current navigation menu should work again. No automatic website reload occurs.

No credentials are needed. If the helper is unavailable, the setup page shows the error and writes fail visibly. To remove the integration, remove the com.studykeys.local.json native-host registration and ~/.study-keys/.integration after preserving your library. Uninstalling the extension does not delete the local library.

## Store item

ID: jcjililghkknjbifgcnnkipiblmmmhid
Data disclosures: Web history (open-tab metadata and saved page identifiers/workspaces), User activity (keyboard commands and reading jumps/marks), Website content (searched passages, selected text, notes and drawings); processed and stored locally. No remote code.
