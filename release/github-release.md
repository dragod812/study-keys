Study Keys 1.3.2 is the first public beta for macOS and Linux.

Vim-style page navigation, word and paragraph endpoint labels, six highlight colors, persistent notes, page/global marks, and floating Excalidraw notebooks.

**The local folder helper is required for saving.** Requires Chrome 131+, Python 3.11+, and Git. Windows is not supported by this beta.

1. Extract `study-keys-chrome.zip` and load its folder with `chrome://extensions` → Developer mode → Load unpacked.
2. Open Study Keys → Set up local folder. Download and extract `study-keys-local-helper.zip`.
3. Run the exact command from the setup page in the helper folder, then check the connection.

The installer creates `~/.study-keys` and registers the helper for your extension ID. It does not upload your library or add a Git remote. The Chrome Web Store listing is being prepared separately.

[Setup and privacy](https://dragod812.github.io/study-keys/) · [Support](https://github.com/dragod812/study-keys/issues)

Validation: 27 JavaScript tests, 12 native filesystem/recovery/installer tests, installed Chrome setup/connection check, and screenshot/demo flows. Prior browser checks cover selection, local persistence, marks, and notebook docking. This beta is not a promise of compatibility with every website.
