# Note Calc Technical Documentation

This document describes the main implementation details of Note Calc.

## Overview

Note Calc is an Obsidian plugin that displays calculated arithmetic results in
Live Preview and Reading view without modifying the Markdown source.

The plugin has four main parts:

- `src/main.ts` loads settings, registers the editor extension, registers the
  Markdown post processor, and exposes the settings tab.
- `src/calculator.ts` detects line-ending formulas, parses arithmetic
  expressions, and formats results.
- `src/live-preview.ts` decorates CodeMirror lines in Live Preview.
- `src/reading-view.ts` inserts visual answer spans in rendered Markdown.

## Formula detection

The calculator evaluates lines that end with `=`.

It supports both full-line formulas:

```text
2 * 3 =
```

And formulas after leading text:

```text
Stop Loss: 208.65 - 1.9874 * 1.5 =
```

When leading text exists, Note Calc searches for the final valid arithmetic
expression before the equals sign and evaluates only that expression.

Lines with existing answers, such as `2*3=6`, are not recalculated because they
do not end with `=`.

## Parser

`src/calculator.ts` implements a small recursive descent parser.

Supported syntax:

- Addition: `+`
- Subtraction: `-` and `−`
- Multiplication: `*` and `×`
- Division: `/` and `÷`
- Remainder: `%`
- Exponents: `^`
- Parentheses
- Decimal numbers and scientific notation

Operator precedence:

1. Parentheses and primary values
2. Exponents
3. Unary plus/minus
4. Multiplication, division, and remainder
5. Addition and subtraction

## Decimal place settings

The plugin stores settings with Obsidian's `loadData()` and `saveData()` APIs.

The current setting is:

```ts
decimalPlaces: number
```

The default is `2`, and the settings UI allows values from `0` to `4`.

Calculation results are formatted with `toFixed(decimalPlaces)`. Very small
values close to zero are normalized to `0` before formatting to avoid results
such as `-0.00`.

## Live Preview rendering

Live Preview support is implemented with a CodeMirror `ViewPlugin`.

For matching lines, the plugin:

- Adds a line class to prevent Markdown emphasis from visually italicizing
  formula operators.
- Adds a widget for inactive-line `*` operators so multiplication remains
  visible in Live Preview.
- Adds an inline decoration to the equals sign and displays the answer with a
  CSS pseudo-element.

The editor extension receives a getter for the current decimal place setting so
new decorations use the latest setting value.

## Reading view rendering

Reading view support is implemented with an Obsidian Markdown post processor.

The post processor walks eligible text nodes, skips code/math/frontmatter/link
contexts, and inserts a `.note-calc-answer` span after a matching text node.

The generated answer is visual only and is not written back to the Markdown
file.

## Build and release

Development build:

```bash
npm run build
```

The production build outputs:

- `main.js`
- `manifest.json`
- `styles.css`

GitHub releases are created from pushed tags by `.github/workflows/release.yml`.
The workflow builds the plugin, uploads the required release assets, and creates
artifact attestations for those assets.
