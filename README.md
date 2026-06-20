# Note Calc

Note Calc evaluates arithmetic expressions in Obsidian without changing the
Markdown source.

## Examples

| Markdown source | Live Preview / Reading view |
| --- | --- |
| `2*3=` | `2*3=6` |
| `2 * 3 =` | `2 * 3 = 6` |
| `2*3=6` | `2*3=6` |

Expressions are calculated only when a line ends with `=`. Existing answers
are left untouched.

## Supported syntax

- Addition, subtraction, multiplication, division, and remainder
- Exponents with `^`
- Parentheses
- Decimal numbers and scientific notation
- Unicode `×`, `÷`, and `−`

Code blocks, inline code, math blocks, frontmatter, and links are ignored.

## Development

```bash
npm install
npm run build
```
