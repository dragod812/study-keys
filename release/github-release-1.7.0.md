Study Keys 1.7.0 adds a local review loop for AI-generated Markdown and HTML.

Open a local document and press **Space r r**. Select words, sentences, paragraphs or sections, add source-anchored feedback, and copy an agent handoff with file hashes, source lines and a command to stage only the reviewed file before making new edits. Review the next revision against the last handoff, staged changes, unstaged changes or HEAD; original comment anchors remain available, including deleted text.

Plain Markdown is rendered directly. Review comments, drafts and handoffs stay in the local library. Existing highlights, notes and drawing notebooks retain the file's identity.

**Update the local helper for this release.** Source access is granted per document and can be revoked in the reader. The helper does not change source files or the Git index. Back up the library including `.snapshots` to retain comparisons; annotation JSON exports do not yet include review records.

First-release scope: one UTF-8 document up to 2 MiB per handoff. HTML uses a static reading view; use Original for source styles, scripts and media. No automatic agent execution or project-wide batching.

See `release/document-review-verification.md` for validation and release status.
