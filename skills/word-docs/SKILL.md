---
name: word-docs
description: Comprehensive Word (.docx) processing skill for creating, editing, extracting, reviewing, converting, and compliance-checking documents. Use when a request involves Word/OpenXML files, DOCX templates, batch doc generation or edits, content extraction, diff/review workflows, or format conversions (docx↔pdf/html/markdown/txt).
---

# Word Docs

## Overview

Provide a single entry point for Word document automation. Use intent routing to choose the correct workflow and scripts for .docx creation, editing, extraction, review, conversion, or compliance checks.

## Intent Routing Rules (MECE)

Classify each request into exactly one of the following intent buckets and follow the matching workflow:

- **A. Create**: generate new docx from data or templates (keywords: generate, template, create, produce, fill, mail-merge).
- **B. Edit**: modify existing docx (replace, insert, delete, merge/split, styles, headers/footers, tables/images).
- **C. Extract**: read content/structure (extract, parse, table extraction, outline, headings, citations).
- **D. Review**: compare/track changes/annotations (diff, revisions, comments, redlines).
- **E. Convert**: change formats (docx↔pdf/html/markdown/txt).
- **F. Compliance**: enforce rules/standards (format checks, style guides, required sections, naming).

If a request seems to match multiple buckets, pick the dominant user goal and note any secondary steps.

## Standard Workflow (All Buckets)

1. **Collect inputs**: file paths, target output path, template (if any), and constraints.
2. **Select toolchain**:
   - Prefer Open XML SDK (C#) for complex structure/style preservation.
   - Use python-docx or direct XML for quick edits or extraction.
3. **Execute**: run the corresponding script or implement the minimal code path.
4. **Validate output**: open/read-back to confirm structure or content.
5. **Summarize changes**: report files created/updated and next steps.

## Bucket Workflows

### A. Create
Use templates or structured data to build new docs. Preserve styles and section breaks. Default output is `.docx`.
Read: `references/create.md` for data→docx patterns and template rules.

### B. Edit
Operate on existing docx. Prefer structure-aware edits (runs/paragraphs/tables) rather than raw string replace when formatting matters.
Read: `references/edit.md` for safe edit strategies and run-splitting pitfalls.

### C. Extract
Return structured JSON/CSV for content or tables. Maintain order and headings.
Read: `references/extract.md` for extraction schemas and table parsing.

### D. Review
Compute diffs and generate redlines/summary. If tracked changes are required, use Open XML or Word-compatible diffing.
Read: `references/review.md` for diff strategy and tracked-changes notes.

### E. Convert
Select conversion path based on target (pdf/html/markdown/txt). Note fidelity trade-offs.
Read: `references/convert.md` for conversion paths and fidelity caveats.

### F. Compliance
Validate formatting rules and generate a report of violations and fixes.
Read: `references/compliance.md` for rule-check templates and reporting format.

## Resources (optional)

### scripts/
Keep task scripts here, named by bucket (e.g., `create_docx.py`, `edit_docx.py`, `extract_docx.py`, `convert_docx.py`).

### references/
Store Open XML structure notes, style tables, and templates used by the scripts.

### assets/
Use for docx templates, logos, or standard document shells.
