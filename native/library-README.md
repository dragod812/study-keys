# Study Keys local library

This folder is the default home for Study Keys highlights, notes and Excalidraw notebooks. It is a local Git repository. Nothing is uploaded automatically.

```
pages/<website>/<page-path>--<URL-hash>/
  page.json                 Original URL and page title
  annotations.json          Highlights, anchors, colors, notes and archived items
  notes.md                  Readable Markdown view of those annotations
  drawing.excalidraw        Editable Excalidraw drawing, including its images
  drawing.json              Drawing revision, timestamp and content hash
  marks.json                Lowercase page-local Vim scroll marks
  recovery/                 Conflicting drafts, if any
settings.json               Per-website keyboard settings
window.json                 Last notebook position, size and docking placement
global-marks.json            Uppercase Vim marks that work across tabs
```

Files appear when that type of content is first saved. Meaningful URL queries and application hash routes get separate page folders. Tracking parameters and ordinary heading fragments do not. Folder names use the URL path plus a stable hash; changing a page title does not move your notes.

Edit notes in Study Keys. `notes.md` is generated and may be regenerated on the next annotation save; `annotations.json` is its structured source. `drawing.excalidraw` opens in Excalidraw and can be edited externally. Reopen an extension notebook after an external edit or Git checkout. Revision checks prevent an already-open editor from silently overwriting those changes.

The extension writes this folder first and keeps a browser cache for reading if the helper is unavailable. A failed disk write is reported; the editor retains the unsaved draft. Save-and-close waits for the disk write. Existing browser annotations are migrated without replacing files already in this library.

`.integration/` contains the machine-specific native messaging helper. `.pending/` contains temporary writes and an interruption-recovery journal. Both are ignored by Git. The helper only reads/writes this library and exposes no network or command-execution API. Restart/reopen the extension after reinstalling the helper.

Use `git status`, `git add .` and `git commit` to keep versions. Connect a **private** GitHub repository if you want a remote backup. This folder can contain private notes, copied passages, page URLs and drawings; Git pushes remain your choice. No remote is configured by the installer, and commits/pushes are never automatic.

To use this library on another Mac: copy/clone it to `~/.study-keys`, load the Study Keys extension, and run its `native/install.py --extension-id <Chrome extension ID>` with Python 3.11+. The helper registration is per machine and is not included in Git.
