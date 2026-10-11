Study Keys 1.4.1 — Keep media shortcuts with one owner

Fixes conflicting Space and f shortcuts on pages with global media controls. Study Keys registers its keyboard boundary before page scripts and claims handled keydown, keypress and keyup events together. Space, v → Space and f no longer also activate competing page shortcuts while Study Keys owns the keys. Typing in Study Keys notes/search is isolated from page shortcut handlers.

Website inputs, native media controls, browser modifiers and IME retain their behavior. Press **i** to pass keys to the website; **Ctrl+C** returns to Normal.

**Reload existing tabs after updating.** This is necessary to register the new handler before site scripts. For unpacked installations, replace files in the same directory and Reload the extension, then reload reading tabs. Keep the existing extension ID and local library. No new permissions; the macOS/Linux local helper requirement is unchanged.

Validation: 36 JavaScript tests, 24 browser DOM checks, and Codex in-app browser keyboard journeys with real local audio and competing window-capture handlers. Covered paragraph selection, f-containing labels, notes/search typing, native website inputs/dialogs, Insert passthrough and a narrow viewport. See [verification](https://github.com/dragod812/study-keys/blob/main/release/media-shortcuts-verification.md) for scope and limitations. Live YouTube was not E2E-tested with an installed extension in the Codex browser.

The Chrome Web Store submission requires Google review before the update becomes available there. This GitHub beta is available immediately.
