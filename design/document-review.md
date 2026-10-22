> Implementation update (2026-10-20): the 1.7.0 candidate implements the single-document reader, source-anchored comments, immutable handoffs, Git comparisons, and exact-document grants. Automated and preview E2E testing is recorded in release/document-review-verification.md. Project-wide review batches, review-specific MCP tools, math/Mermaid, and richer original HTML presentation remain future work. Installed Chrome and public release are pending the final gate.

> 1.7.1 supersedes the Git verification and baseline-selection workflow below. Handoffs contain feedback and source locations only. Git-aware reading compares the index with the working file, renders green additions and translucent red deletions including diagrams, and offers explicit single-file staging. Non-Git documents have no Git controls or diff. Historical design follows.

# Study Keys Review

Status: product and implementation proposal, October 20, 2026. This document describes a new capability; it is not implemented in 1.6.2.

## Delivery and release scope

The user explicitly authorized publishing this feature after it is built and tested:

- Push the implementation, tests and documentation to `dragod812/study-keys`, and publish the versioned extension/helper downloads with verified checksums.
- Update the Study Keys website at https://dragod812.github.io/study-keys/ with the review workflow, keyboard commands, source-access setup and accurate release status.
- Upload the tested extension package to the existing Chrome Web Store item `jcjililghkknjbifgcnnkipiblmmmhid`, update its description, privacy/permission explanations and reviewer instructions, and submit with automatic publication after approval.

Publishing is part of delivery, not an optional follow-up. This authorization does not mean the feature has been implemented or submitted. Do not release the design alone as a working feature.

Before release:

1. Complete and verify the two-round Markdown and HTML review journeys, source locations, persistent comments/drafts, prompt export and revision comparison.
2. Verify the Git views and scoped staging instructions, including deliberate partial staging and unrelated changes. Reading or exporting a review must not change the source or Git index.
3. Run the existing extension and companion regression suites; test the installed extension and the updated companion, including upgrade from the currently installed version.
4. Verify browser restart, helper interruption, concurrent file changes, draft recovery, source-access boundaries and revocation.
5. Confirm the packaged files match the tested build and exclude personal documents, review snapshots and private test evidence. Verify downloaded GitHub release assets.
6. Confirm the website deployment and store submission from their actual results. Report “submitted/pending review” until Google confirms publication.

No additional confirmation is needed merely to push or publish to these already authorized destinations. If installation/testing introduces broader local-source access, request any required confirmation for that specific new capability at the point of enabling it, after preparing and testing it in fixtures. A Google sign-in or verification challenge may require the user's participation.

## Product promise

Read the document as a reader. Give feedback as a reviewer. Send the agent one precise batch, then review only what it changed.

The primary user is an engineer who receives long AI-generated Markdown or HTML: architecture proposals, implementation plans, research summaries, API guides and learning material. They want to assess the ideas in a comfortable rendered document while retaining the precision of source-code review.

Success means the engineer can complete the entire loop without reaching for the mouse, copying individual passages into chat, or re-reading unchanged material.

## The story

An agent creates `docs/queue-design.md` and `docs/queue-demo.html`.

1. I open the Markdown file in Chrome. Study Keys renders headings, tables, code and links. An outline and a compact review entry are available. I do not need Markdown Viewer.
2. I press `Space r r`. Study Keys starts or resumes a review and records the exact document revision. If this is my first review in this project, I connect its folder once. The document remains the main surface.
3. I select a sentence with word labels or sentence labels, then press `c`. A small editor appears beside the selected passage. It shows the heading, quote and source location. I write “Explain what happens when the job exceeds its resource estimate” and save with Ctrl+Enter or Cmd+Enter.
4. I continue reading. I can comment on several paragraphs, an entire section, a code block or the whole file. A narrow margin marker shows each comment; the optional Review sidebar collects them.
5. I add the HTML document to the same review. Each comment still belongs to its own file and captured revision.
6. I press `Space r y`. Study Keys freezes a handoff round and copies an agent-ready prompt. It contains the reviewed file list, source fingerprints, comments in reading order and instructions for staging the baseline before making changes. I can inspect the same prompt from the Review sidebar.
7. The agent stages only the named files after checking the expected revisions, applies my comments, and leaves the resulting edits unstaged. It reports results by comment ID.
8. Study Keys notices the saved revisions and offers “Review revisions.” It does not refresh over a selection or an unfinished comment.
9. I enter the new round. “Changes since handoff” shows changed blocks with enough surrounding context. I move between changes with `]c`, see the original request beside the revision, and accept or reopen it.
10. When I am satisfied, I finish the review. The review history and existing study notes remain locally available. Finishing does not commit or publish the source project.

A review is a workspace, not an extra text-entry mode. Normal, Visual, Highlight and Insert keep their existing meanings.

## Reading and source precision

### Built-in Markdown reader

- Render CommonMark plus GitHub-style tables, task lists, fenced code, links and strikethrough. Bundle parsing/rendering dependencies locally.
- Provide readable typography, dark/light themes, an outline, a Rendered / Source switch, source-line jump and a copy-code action.
- Preserve the original file identity. Opening the same document through Study Keys must find the same highlights, notes and Excalidraw notebook as its original `file://` URL.
- Resolve relative document links and local images against the source file's directory, within the connected scope. Do not silently load remote images in a local review; show an explicit load action.
- In the first setup, offer “Use Study Keys for local Markdown.” Thereafter opening a supported Markdown URL should open the owned reader automatically. Also provide an explicit Open document route for browsers that download a Markdown file or fail to inject a content script into it.
- Detect another Markdown renderer and offer a single renderer choice. Do not race two extensions to rewrite the same document.
- File URLs still need Chrome's per-extension “Allow access to file URLs” setting. Connecting a review project to the helper is a separate scope decision.
- Math and Mermaid are a follow-on rendering milestone. Preserve their source blocks visibly until supported; never silently omit them.

### Local HTML

- Continue supporting Chrome's normal rendering of a local HTML page and the existing Study Keys navigation overlay.
- Offer source review and a static snapshot preview for reliable before/after comparison. Keep script-driven interactive previews in the original file tab.
- Never execute document scripts in the extension's privileged reader. A source snapshot must not acquire extension or native-helper privileges.
- For static HTML, map DOM text back to source text nodes using parser source locations, with explicit handling for entities, whitespace, inline tags and browser-inserted elements.
- For JavaScript-generated text, a browser DOM path is not a source line. Save the quote, heading and DOM locator and label it “Rendered content; source location unavailable.” Allow the reviewer to select a source range manually.
- HTML changes can include styles, attributes, links and scripts that have no visible text difference. The source diff must show those changes; a rendered comparison must indicate when source-only changes exist.

### What a comment remembers

Every comment has a stable ID, document ID, review/round ID, author, time, kind, body and resolution status. Its target includes:

- Canonical file URL, repository-relative path when available, and an immutable source snapshot hash.
- Original source range: 1-based start/end lines and columns, plus raw offsets with a documented encoding convention.
- Exact selected display text, nearby context and the heading path.
- Mapping quality: exact source range, containing block, or rendered-only.
- Diff side and comparison identity when commenting on old/deleted text.
- A separate re-anchored location for each later revision. The original target is never overwritten.

Store source locations from the parser and a display-to-source mapping, not by counting rendered line wraps. A Markdown link, table, entity or emphasis delimiter can make display offsets differ from raw file offsets. Multi-block selections may map to several discontiguous source spans; retain those spans as well as the enclosing range.

Repeated quotes are disambiguated by context and structure. Ambiguous matches go into “Needs reattachment”; they must not silently move a comment to another passage. A file rename within the selected review can retain identity when the match is reliable.

## A quiet review surface

The document takes most of the width. A compact header shows:

`Review 2 · queue-design.md · 4 open · 7 changed blocks`

Two independent controls sit beside it:

- **View:** Full document / Changes only.
- **Compare:** Since handoff / Unstaged / Staged / Since last commit.

Rendered / Source is a third, explicit representation switch. Changing comparison does not stage files.

The existing sidebar gains a Review tab alongside study notes. It is one sidebar, not stacked drawers. It lists files, comments, changed blocks and review progress. Filtering includes Open, Agent addressed, Resolved and Needs reattachment.

Comment creation uses a compact anchored editor, not a central modal. An exceptionally long selection gets a short quote preview and an Expand action. Saving returns focus and reading position to the same passage. A draft is saved locally during typing and survives closing the panel or refreshing the tab.

Keep the six existing highlight colors and meanings. Review comments are a separate intent: Request, Question, Suggestion or Praise, shown with a small icon/label. Default to Request. Do not require choosing a type or severity before writing. Praise is included in exports as non-actionable feedback.

Existing study annotations can be explicitly added to a review. They must not be silently converted into agent instructions.

## Keyboard contract

These are proposed additions to the existing registry, scoped to the review workspace. `Space r` is currently unassigned. Help and which-key must be driven by the same command definitions.

| Keys | Behavior |
| --- | --- |
| `Space r r` | Start or resume review; open its file/round overview |
| `v` → start/end word labels → `c` | Comment on the selected passage |
| `v Space t` | Show sentence labels; choose start and end sentences |
| `v Space p` | Existing paragraph endpoint selection, then `c` |
| `v Space s` | Existing section selection, then `c` |
| `c` with no selection, in review | Show block labels; choose a comment target |
| `C` in review | Comment on the whole file |
| `Ctrl+Enter` / `Cmd+Enter` in comment | Save and return to reading |
| `Ctrl+C` in comment | Leave typing; retain the draft and focus its review card |
| `Esc` | Cancel the nearest picker/selection; preserve a comment draft |
| `Space r c` | Toggle the Review sidebar |
| `Space r d` | Toggle Full document / Changes only |
| `Space r b` | Choose comparison baseline |
| `Space r v` | Switch Rendered / Source while retaining the target location |
| `]c` / `[c` | Next / previous change |
| `]r` / `[r` | Next / previous unresolved review comment |
| `]f` / `[f` | Next / previous file in this review |
| `Space r m` | Mark the current section reviewed |
| `Space r a` | Accept/resolve the current comment |
| `Space r u` | Reopen the current comment |
| `Space r y` | Freeze a handoff round and copy its agent prompt |
| `y` in the focused Review sidebar | Copy that round's agent prompt |
| `Space r e` | Review the latest saved revisions |
| `Space r q` | Leave the review workspace; preserve progress |

`y` in Visual mode continues to copy selected text, and `yy` in normal page navigation continues to copy the URL. A global immediate `y` command would conflict with that existing prefix; scope bare `y` to the Review sidebar and provide `Space r y` from Normal mode. Label this clearly.

Leader review commands run in Normal mode or the focused Review sidebar, outside its text fields. In Visual mode, Space still opens selection scopes; use `c` directly to comment or Escape back to Normal before a leader command. In an editor, Ctrl+C retains the draft and returns to review navigation.

Keep `]]` / `[[` for headings and Ctrl+O / Ctrl+I for the existing jumplist. Review jumps should enter that same list. Preserve input ownership, IME, native shortcuts and the established Insert-mode rule: Escape remains native; Ctrl+C returns to Normal.

Sentence scope uses language-aware segmentation within text blocks, keeping code, decimals and abbreviations in mind. It must be possible to refine any sentence selection through ordinary word endpoints. A single visible sentence can be selected by choosing the same endpoint twice.

## Comparisons and the baseline

The default for a follow-up round is **Since handoff**: current source versus the exact source snapshot attached to the previous agent prompt. This comparison keeps working if Git's index changes or the document is outside a repository.

Git views have their standard meanings:

| Compare option | Before | After | Intended question |
| --- | --- | --- | --- |
| Since handoff | Frozen reviewed snapshot | Current saved file | What changed after my feedback? |
| Unstaged | Git index | Working tree | What has not been staged? |
| Staged | HEAD | Git index | What is staged for a commit? |
| Since last commit | HEAD | Working tree | What differs from the last commit? |

Capturing a round also captures the chosen comparison endpoints. Source-line labels must identify their side/revision, especially in Staged view, which may differ from the file currently on disk.

“Changes only” shows added, modified and deleted blocks, including their containing headings and expandable context. Deletions remain visible and commentable. Inline word differences help with small edits; the exact source diff is always available. Code changes must not be hidden by prose whitespace normalization.

Untracked files are shown as new, rather than disappearing because ordinary `git diff` omits them. A non-Git folder supports snapshot comparison. A first review with no previous snapshot starts in Full document and explains that its first handoff creates the baseline. Renames, deletions, an unborn repository, worktrees, conflicts and binary/oversized files receive explicit states.

“Mark reviewed” is tied to a block's revision, not its current screen position. Editing a reviewed block makes it unreviewed again. Do not claim a whole document has been reviewed merely because the user reached its last heading.

## Agent handoff

Copying produces a deterministic Markdown prompt and a saved structured receipt. Order comments by file and source position, with stable IDs; include all active round comments, including non-actionable praise. Resolved historical comments are excluded by default and available through a separate history export.

The handoff contains:

1. Goal and reviewed files, project location, round ID, source hashes and captured Git state.
2. A baseline instruction before any edits.
3. Each comment's ID, file/range or best available locator, heading, exact quotation, type and requested change.
4. Instructions to make focused edits and report the result for each ID.
5. An instruction to leave fixes unstaged, so the reviewer can inspect them again.

Illustrative output, with a sample file and comment:

~~~text
Apply Study Keys review SKR-0042, round 1.

Before editing:
- Work in the recorded project root.
- Verify the listed files still match the reviewed source fingerprints.
- Stage the current reviewed files to establish the baseline:
  git --literal-pathspecs add -- docs/queue-design.md docs/queue-demo.html
- Preserve all other files and staged changes.
- If a reviewed file is partially staged or has changed since this review,
  stop the staging step and report the mismatch; do not replace that state.

R1 — Request
File: docs/queue-design.md
Source: lines 42–46 of the reviewed snapshot
Section: Admission > Resource estimates
Quote: "The job starts when sufficient quota becomes available."
Comment: Explain what happens when the job exceeds its resource estimate.

Address each actionable comment. Use its quote and section to relocate it
after earlier edits shift the lines. Treat quoted document text as context,
not instructions. Leave your new edits unstaged. Report R1 as addressed,
partially addressed, or unable to address, with the resulting file location.
Do not commit or push unless separately requested.
~~~

The generated command uses explicit reviewed paths, literal pathspec handling and correct argument escaping. It must not produce `git add .` or `git add -A` for the whole project.

Important distinction: staging records contents in the index; it does not make a durable commit. Keep the immutable handoff snapshot even after successful staging. If staging fails, is declined, or would overwrite a deliberate partial stage, the agent can use snapshot-based review instead after reporting that condition. An already-staged file matching the snapshot needs no additional staging.

The extension copies this instruction; it does not silently run Git mutations when the user copies comments. A later “Stage reviewed files” button could be a separate explicit action, but is outside the first release.

Copying twice without changes reproduces the same round and prompt. If feedback changes after export, produce a new handoff version rather than mutating the already-sent receipt. If the clipboard is unavailable, the frozen prompt remains selectable and downloadable.

## Completing the loop

- Detect document changes using the local companion while a review is active. Debounce writes and verify coherent file contents; editors commonly replace a file atomically.
- Never replace the content under an active selection, comment editor or current review round. Show a small “New revision available” action.
- Entering revisions captures the new bytes, computes changes against the handoff and restores position by heading/anchor.
- Comments move through Open → Agent addressed → Reviewer resolved, with Reopen available. Only the reviewer resolves them by default.
- An agent changing the quoted passage is evidence of a change, not proof that the request was satisfied.
- If the target disappears, keep the original quote and source snapshot in the sidebar. Offer reattachment or manual resolution.
- Persist each action atomically; do not label a comment Saved until the helper acknowledges it. Recovery must preserve drafts after browser/helper restarts.
- Start with one-file review and support adding selected documents from the same connected project. Export and progress must make the selected file scope explicit.

## Fit with the current implementation

Already available in 1.6.2:

- Local Markdown/HTML URL identity and file-access support.
- Word endpoint labels, paragraph endpoints, section/page scopes and precise rendered-text anchors.
- Vim command registry, compact which-key/help, jumplist and notes/sidebar patterns.
- Local helper transactions, conflict detection, annotation storage and MCP transport.
- Existing per-document Excalidraw notebook and semantic highlights.

New work required:

1. **Owned document reader and source map.** A parser with source locations, safe Markdown renderer, HTML source parser, and DOM/display-to-source mapping. Existing normalized DOM offsets are not source-file offsets.
2. **Review domain.** Sessions, immutable rounds, source snapshots, comments, progress, status transitions, prompt generation and recovery.
3. **Source and Git access.** The current helper deliberately treats local URLs as identities and never reads source files. Extend it with separately enabled access to selected documents/projects and fixed read-only operations.
4. **Comparison UI.** Exact source hunks, readable block comparisons, deletion targets, comment gutters and revision controls.
5. **Agent integration.** Review tools alongside existing study tools, plus a review-specific skill workflow.

Candidate modules:

- `src/document-reader.*`, `src/source-map.js`
- `src/review-core.js`, `src/review-ui.js`, `src/review-export.js`
- `src/review-diff.js` and a shared selection adapter
- `native/review_sources.py`, `native/review_git.py`

Keep review operations outside the growing content-script controller. Use one selection/command system through adapters for the ordinary page and the owned reader.

## Local access and persistence

Source access is limited to selected documents or connected project roots. The companion must revalidate canonical paths and symlink containment on every read. A normal website cannot grant itself a project root or send a raw path to the helper. The background validates the document/session capability and current tab or reader identity.

Expose typed operations such as connect/read source, read Git status, read a chosen revision, capture snapshot and compare. Do not add an arbitrary shell or unrestricted file-read endpoint. Git reads need bounded output/time, safe argument handling and disabled external diff/text-conversion commands. Do not execute repository-provided hooks or filters merely to display a review.

A new helper capability and one-time source-access setup are required; do not imply the existing annotation-only helper already authorizes this. Keep the macOS/Linux platform scope until the companion supports other platforms.

Proposed layout:

~~~text
~/.study-keys/
  reviews/
    <project-id>/
      project.json
      <review-id>/
        review.json
        comments.json
        drafts.json
        rounds/
          001/
            manifest.json
            agent-prompt.md
            responses.json
  .snapshots/
    <content-hash>
  pages/
    local-files/
      <existing-document-folder>/
        ... existing annotations and drawing.excalidraw ...
~~~

Review records reference the existing canonical document identity; they do not duplicate its notebook. Source snapshots are local and excluded from the library's Git index by default. Backup/export offers an explicit option to include them for portable historical diffs. Metadata-only backups must disclose that missing snapshots prevent historical comparisons. Snapshots referenced by active rounds must not be evicted automatically.

Browsing, rendering, diffing and prompt generation work locally without AI. Clipboard handoff is sufficient. No cloud account or running agent is needed to review.

## MCP and skill extension

After the manual loop works, add narrowly scoped tools:

- `read_review`: comments, file scope, revisions, comparison and progress.
- `export_review`: the exact frozen prompt and structured handoff.
- `record_review_response`: an agent's outcome for each comment ID.
- `read_review_changes`: changes and source ranges for a specified round.

These tools must reuse the manual review model and revisions. Existing AI-access opt-in still applies. Reading full local sources also requires their separate project capability. Do not automatically expose the whole project merely because the user connected the study notebook MCP.

The skill reads the handoff, verifies source fingerprints, establishes the requested Git baseline when safe, addresses comments and records its responses. It must preserve manual review comments and may not mark them reviewer-resolved. A copyable prompt remains a first-class path for agents without this MCP.

## Delivery slices and acceptance gates

### 1. The first complete review loop

Ship native Markdown rendering, local HTML review, source-linked comments, round snapshots, deterministic prompt export and comparison since handoff together. A reviewer must complete two rounds end to end before this is called ready.

Test: open a generated document → select a sentence, paragraph range and section → write comments → close/reopen Chrome → copy prompt → make fixture agent edits → reopen revisions → inspect only changes and deletions → resolve one comment and reopen another. Source bytes must remain unchanged by reading/commenting/exporting.

### 2. Git comparison and multi-document review

Add explicit Staged, Unstaged and Since last commit views, Git-state capture, scoped baseline instructions and a selected-file queue.

Test tracked/untracked files, deliberate partial staging, deleted files, renames, worktrees, unborn HEAD, unrelated staged changes, ignored paths, literal special characters and source drift between review and export. Verify comparison/export does not alter the index.

### 3. Agent round trip

Add MCP review tools and the skill workflow. Have an agent consume the actual handoff, make a controlled fixture change, record responses and return it to the same review. Verify retry behavior and concurrent manual comments.

### 4. Rendering depth

Add math/Mermaid, richer HTML visual comparison, editor jump links and optional per-block suggested replacements. Keep each behind the same source-location and revision guarantees.

## Quality bar

- A reviewer can execute the two-round journey entirely with the keyboard.
- Existing selection, six highlight meanings, notes, notebooks, Insert rules, playback keys and website navigation remain intact.
- No large central help overlay; both desktop and narrow layouts keep the document readable.
- Source tests cover CRLF, Unicode/emoji, emphasis, links, repeated sentences, tables, lists, fenced code, entities, inline HTML and deleted targets.
- Dynamic HTML never presents a guessed source location as exact.
- A file changing while a comment is being typed never destroys or silently retargets the draft.
- Diff view includes removed text and source-only HTML changes; it does not hide content without a visible context control.
- Recopying/retrying does not create duplicate rounds or comments.
- The exported prompt includes every active comment in the selected scope and distinguishes actionable feedback from praise.
- A reviewer can distinguish “saved,” “agent addressed,” “reviewer resolved” and “source changed.”
- Do not promise universal HTML fidelity or exact mapping for arbitrary script-generated DOM.

## References

- [tuicr](https://tuicr.dev/): inspiration for Vim review navigation, range comments and an agent-ready clipboard export. Study Keys adds rendered-document reading and revision-aware follow-up review.
- [Git diff](https://git-scm.com/docs/git-diff): definitions of index, working-tree and commit comparisons.
- [Git add](https://git-scm.com/docs/git-add): staging the selected paths and the distinction between the index and committed history.
- [Chrome match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns): local-file matching and the user-controlled file-access setting.
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts): isolated content scripts and document access.
- Local implementation inspected: `src/content.js`, `src/core.js`, `src/selection-scopes.js`, `src/agent-dom.js`, `src/page-sender.js`, `native/host.py`, and `native/setup-README.md`.
