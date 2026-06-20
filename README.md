# Note Calc

Note Calc brings Apple Notes-style inline calculations to Obsidian. Write an
arithmetic expression ending in `=` and the result appears in Live Preview and
Reading view without changing the Markdown source.

## Usage

Enter an expression on its own line:

| Markdown source | Live Preview / Reading view |
| --- | --- |
| `2*3=` | `2*3=6` |
| `2 * 3 =` | `2 * 3 = 6` |
| `2+3*4=` | `2+3*4=14` |
| `(2+3)×4=` | `(2+3)×4=20` |

Note Calc evaluates only lines that end with `=`. If an answer is already
present, such as `2*3=6`, the line is left unchanged.

Calculations are visual only. Note Calc never writes the generated answer into
your note.

## Supported syntax

- Addition: `+`
- Subtraction: `-` and `−`
- Multiplication: `*` and `×`
- Division: `/` and `÷`
- Remainder: `%`
- Exponents: `^`
- Parentheses
- Decimal numbers and scientific notation

Standard arithmetic precedence is supported: parentheses and exponents are
evaluated before multiplication and division, followed by addition and
subtraction.

## Editing modes

- Source mode shows the original Markdown without generated answers.
- Live Preview shows answers alongside editable expressions.
- Reading view shows answers in rendered notes.

Code blocks, inline code, math blocks, frontmatter, and links are ignored.

## Platform support

Note Calc is designed for both desktop and mobile Obsidian. It is not marked
as desktop-only.

## Manual installation

Copy these files into `.obsidian/plugins/note-calc/` inside your vault:

- `main.js`
- `manifest.json`
- `styles.css`

Then reload Obsidian and enable **Note Calc** under **Community plugins**.

## Development

```bash
npm install
npm run build
```

## License

[MIT](LICENSE)
