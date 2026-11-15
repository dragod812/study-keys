# Study Keys release and local update — 2026-11-15

## Tested code and artifacts

The 1.7.3 working diff includes the guarded MV3 patch and review flow changes documented in mv3-1.7.2-verification.md. Final automated verification: 131 JavaScript tests pass, 40 native helper tests pass, and the final ZIP build passes its package audit. The only subsequent changes are release records and website text. Helper status now reports companion 1.7.3 and setup accurately describes the explicit single-document staging action.

## Marketplace receipt

Chrome Web Store accepted the 1.7.2 upload. The updated store description was saved and submission with automatic publication enabled returned “Your extension was submitted for review.” Package information confirmed draft 1.7.2 and published 1.7.1. Source for that submitted package is ad130a7; SHA-256 a35b824845ccdc7c9c2c594b2d1b8511475e34de5d562396f267fed580c15d67.

Final local smoke checking then caught outdated helper version/setup text. Prepared 1.7.3 with those corrections. Its replacement upload was rejected by the dashboard: “The item cannot be updated now because it is in pending review, ready to publish, or deleted status.” “Why can't I submit?” confirmed the item is in review. The listing's More menu did not expose Cancel review for this warned item; it offered Preview, Discard draft, Unpublish and Transfer. No destructive or unrelated account action was taken. The accepted 1.7.2 submission remains in review; no approval or 1.7.3 store submission is claimed.

## Local Chrome receipt

Loaded 1.7.3 as an unpacked local update using the existing public key; independently checked that the key hashes to the original extension ID jcjililghkknjbifgcnnkipiblmmmhid. Chrome's details showed version 1.7.3, that ID and the prepared versioned local directory. Existing file access, toolbar pin and enabled state were preserved. No duplicate extension ID was introduced.

Updated the existing helper code in ~/.study-keys/.integration, with a dated backup of prior helper code; registration and AI access settings were preserved. Actual setup UI confirmed “Connected” and companion 1.7.3. In the installed reader, granted access only to the disposable Architecture.md fixture and inspected the rendered Markdown, table and Mermaid diagram. The preview comments used an isolated preview library; the installed-reader smoke check created no feedback. The source fixture remained unchanged.

The local extension is unpacked, so it is available immediately rather than waiting for store approval. A future move back to the store-managed copy must preserve this same identity and local library. The 1.7.3 ZIP and helper are published to GitHub; replacing the pending store package remains gated by Google review state.
