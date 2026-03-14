# Edit (Modify Existing DOCX)

## Use when
- Replace text, insert/delete sections, update tables/images.

## Pitfalls
- Word text is often split into multiple runs; avoid naive string replace.
- Prefer structure-aware edits on paragraphs/runs.

## Safe edit checklist
- Backup original
- Locate target by paragraph + run
- Preserve styles and numbering

