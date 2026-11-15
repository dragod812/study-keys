Study Keys 1.7.4 adds **W** in Normal mode to move the current tab into its own focused Chrome window. Use Shift+w or capital W via Caps Lock.

The existing tab is moved rather than reopened, preserving page state and unsaved form text. Private tabs stay private. Existing typing and Insert-mode behavior remains unchanged. The shortcut is included in the keyboard guide; no extra permissions or helper update are needed (the current helper remains 1.7.3).

Validated with 134 automated tests and a real Chrome keyboard test: Shift+W created a one-tab window, an unsaved textarea value survived, and the page load counter remained 1.

Installed locally as 1.7.4 with the existing extension ID. The Chrome Web Store still has 1.7.2 pending review, which blocks another package upload; this GitHub package is ready for the next store submission.
