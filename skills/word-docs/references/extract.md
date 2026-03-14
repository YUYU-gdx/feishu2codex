# Extract (DOCX → Structured Data)

## Use when
- Extract text, headings, tables, metadata.

## Output schema (example)
- sections: [{heading, level, text}]
- tables: [{caption, rows}]
- metadata: {title, author, created}

## Tips
- Maintain order of paragraphs.
- Handle tables separately to avoid losing structure.

