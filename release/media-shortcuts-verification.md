# Version 1.4.1 keyboard ownership verification

Date: 2026-10-11. Requested browser: Codex in-app browser.

## Change

The old content script registered a document-capture keydown listener at document_idle. A site’s window-capture listener could run first, and site keypress/keyup listeners still received commands after Study Keys changed mode or focus. The new boundary registers synchronously on Window at document_start, before site scripts; UI creation waits for DOMContentLoaded. It tracks ownership for each physical key until release. Extension fields retain native text-input defaults while their keyboard events are isolated from host-page listeners.

No new permissions, network endpoints, dependencies, storage changes or helper changes.

## Automated checks

- 36 JavaScript tests passed, including five new key-boundary tests: full key lifecycle, mode changes/repeats, UI defaults, browser modifiers/IME/untrusted events, and lost-release cleanup.
- 24 browser DOM/range checks passed in the Codex browser: selection, reanchoring, paragraphs/sections, links, visibility and clipping.

## Codex browser keyboard journeys

Used the source-bundled preview with isolated test storage. The media fixture registers competing window-capture handlers before DOMContentLoaded, with Space on keydown and f on keyup. A generated silent WAV provides real local audio playback; fullscreen changes are simulated counters.

- Normal Space opened the command menu without changing playback or firing site key handlers.
- v → Space → p opened paragraph labels; choosing start label af and an ending paragraph preserved real playback and produced a visual range. The f key did not change the fullscreen counter.
- Normal f opened visible-control hints; audio remained unpaused with readyState 4.
- Search accepted f and Space with zero site key events. ArrowDown/Enter selected First chapter correctly.
- Notes accepted f/Space and saved using Cmd+Enter with zero leaked site key events.
- Insert i passed Space and f to the page, toggling playback and the fullscreen counter exactly once each. Escape stayed in Insert mode.
- Website input accepted f and Space and retained focus on Escape. The site saw these native events.
- A native website modal closed with Escape.
- At 480 × 720, the scope menu remained usable and playback continued. The viewport override was reset.

## Limits

This is a reproducible local integration test, not a live YouTube E2E test. The Codex browser cannot load this Chrome extension through the available interfaces; the preview bundles the same content code with a test transport. Actual Chrome was used only to reload the installed extension, as requested. The Codex input driver did not deliver Ctrl+C to this page (no key events), so the exit chord was covered by automated regression tests and its previously tested implementation was retained. Fresh tab loads are needed for document_start ordering; existing tabs keep their old handlers until reloaded. Embedded cross-origin frames remain outside the extension’s existing scope.
