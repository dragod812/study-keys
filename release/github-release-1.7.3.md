Study Keys 1.7.3 includes the Manifest V3 correction and Markdown review improvements from 1.7.2, plus corrected setup instructions and helper version reporting.

- Removes unused Twitter/X, Reddit and GitHub Gist remote script loaders from the packaged drawing code, with guarded build checks and package auditing.
- Speeds up Markdown view changes with bounded image caching and memoized comparisons; unchanged text avoids redundant diff work.
- Preserves the visible source passage when switching views and allows failed diagrams to retry.
- Includes Unstaged / Staged / All uncommitted Git views, comment delete/undo and improved review drafts.
- Corrects helper setup guidance: source files stay read-only; the explicit Stage file action stages only the approved document.

Validated with 131 JavaScript tests, 40 helper tests and Chrome workflows. Update the companion and reload document tabs.

Marketplace status: version 1.7.2 (security and Markdown improvements) was submitted successfully with automatic publication after approval. Google blocks package replacement while that review is pending, and its warned-item dashboard does not expose Cancel review. Version 1.7.3 is available here and installed locally; it has not yet been accepted as a Web Store upload.
