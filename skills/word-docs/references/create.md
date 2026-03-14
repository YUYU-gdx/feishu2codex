# Create (Data/Template → DOCX)

## Use when
- Generate new Word documents from structured data or templates.
- Batch report/contract generation.

## Inputs to collect
- Template path (optional)
- Data source (JSON/CSV)
- Output path
- Required sections and order

## Preferred approach
- Open XML SDK for complex structure or strict style preservation.
- python-docx for lightweight generation.

## Notes
- Preserve section breaks and styles.
- If using placeholders, define a consistent token format (e.g., {{FIELD}}).

