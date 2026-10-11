# Study Keys Markdown notebook

This sample is a disposable document for testing Study Keys with Markdown Viewer. Use the keyboard to select these words, highlight the important passage, and leave a note for your next visit.

## Bounded work

Quota keeps work bounded. A queue admits a job only when the required resources are available. This paragraph is the persistence check: its highlight should return after reloading this file.

Separate reading from editing. Study Keys saves your annotations and drawing notebook in its own library. This Markdown source stays unchanged when you add a highlight or a note.

Visit the [second local document](Second%20Sample.md), open the [Study Keys website](https://dragod812.github.io/study-keys/), or jump to [review questions](#review-questions).

## Reason about limits

Start with the outcome and work backward. A resource budget makes the admission decision explicit. The scheduler can then place the admitted work on suitable machines.

Consider the scarce resource first. Some jobs need many small workers, while others need a few large ones. A good policy can explain both choices without hiding the tradeoffs.

### Small example

| Team | Budget | Running |
| --- | --- | --- |
| Research | 8 CPUs | 6 CPUs |
| Training | 16 CPUs | 12 CPUs |

```yaml
queue: research
cpu: 2
memory: 4Gi
```

The configuration above is sample text. It is not an executable action. Keyboard labels should work on ordinary paragraphs and code, while the drawing editor keeps its own shortcuts.

## Review questions

What happens when a job cannot fit within its budget? Which policy decides whether a running job can yield resources? Save a red Question highlight and record your reasoning in a note.

Use a drawing to connect the queue, the admission decision, and the worker pool. Reopen the notebook to check that the diagram stays attached to this file.

## Final checkpoint

Return to the first section with the jumplist or a mark. Find the word bounded using literal search. Search across loaded documents to discover the second sample’s distinct phrase.

This is the end of the disposable sample. All sample annotations may be archived after testing.
