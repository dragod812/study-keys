Study Keys 1.7.2 removes unused remote embed script loaders from the packaged Excalidraw drawing editor to address the Chrome Web Store Blue Argon warning.

- Removes Twitter/X, Reddit and GitHub Gist generated-document script loaders at build time. Social embeds remain disabled; drawing and local imports/exports remain available.
- Fails the build if the pinned upstream patch no longer matches. Audits packaged JavaScript and HTML for known widget loaders, generated script tags, remote imports and remote workers.
- Includes document-review improvements: Unstaged / Staged / All uncommitted comparisons, comment delete/undo, improved drafts and Git refresh handling.
- Includes the compatible DOMPurify security update and the standalone Herdr reviewer forwarding commands.

Update the local helper to use the new document-review comparisons.

Validation: 127 JavaScript tests, 40 helper tests, audited package build and isolated Chrome drawing/save smoke test with no remote requests or page errors. This is a resubmission candidate; Chrome Web Store approval is separate.
