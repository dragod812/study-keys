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

YOUR LIBRARY, IN YOUR FOLDER
Highlights, notes, marks, and drawings save in ~/.study-keys, organized by website and page. Chrome keeps a local cache. Export a backup or manage the folder with your own Git workflow. The helper initializes a local Git repository but never adds a remote, commits, or uploads your library. No Study Keys account, analytics, or cloud sync service is required or used.

BETA LIMITS
Chrome-internal pages, the built-in PDF viewer, embedded frames, closed shadow roots, and canvas-rendered text are outside the supported scope. Highlight restoration depends on finding the original text. The readable text index is capped at 2 million characters; a saved annotated passage is limited to 100,000 characters. When the helper is unavailable, cached notes remain readable and new saves report an error. Keep backups of your local folder.

Setup, helper downloads, privacy details and support:
https://dragod812.github.io/study-keys/

## Single purpose

Help users study web pages with keyboard navigation, local passage annotations, and page-linked drawing notebooks.

## Permission explanations

- storage: Save extension preferences, a local cache of the user's annotations and drawings, and temporary notebook sessions. No Chrome sync storage is used.
- unlimitedStorage: Keep image-containing Excalidraw notebooks and the user's local annotation cache without Chrome's small default local-storage quota.
- sidePanel: Display the current page's highlights and notes in Chrome's side panel when opened by the user.
- nativeMessaging: Communicate only with the separately installed com.studykeys.local helper to save and restore the user's library in ~/.study-keys. The helper has no network or arbitrary command API. It accepts only explicitly registered extension IDs.
- HTTP/HTTPS content script matches: Read visible page text and controls for keyboard navigation, selection labels, and restoring user-created highlights. Study Keys processes text on device and saves only the user-requested annotations, page identifiers, marks, and drawings.
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

No credentials are needed. If the helper is unavailable, the setup page shows the error and writes fail visibly. To remove the integration, remove the com.studykeys.local.json native-host registration and ~/.study-keys/.integration after preserving your library. Uninstalling the extension does not delete the local library.

## Store item

ID: jcjililghkknjbifgcnnkipiblmmmhid
Data disclosures: Web history (saved page identifiers), User activity (keyboard commands and saved scroll marks), Website content (selected text, notes and drawings); processed and stored locally. No remote code.
