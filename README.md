# Note Calc

Note Calc is an Obsidian plugin that displays arithmetic answers beside expressions ending in `=`. It supports Live Preview and Reading view for calculations inside notes, without saving generated answers into the Markdown file.

## Features and usage

The following features are **Implemented** and connected through the plugin's `onload()` path:

- Arithmetic with parentheses, unary signs, powers, multiplication, division, remainder, addition, and subtraction.
- Decimal and scientific notation, plus comma-separated integer groups such as `1,000` and `2,686.50`.
- Currency symbols before numeric operands, retaining one consistent symbol in the answer. No currency conversion is performed.
- Comma-grouped answers with a configurable 0–4 decimal places; the default is 2.
- Click an answer to copy its formatted value, or focus it and press Enter/Space. Clipboard success or failure produces an Obsidian notice.
- Select and copy a complete formula with its generated answer. Live Preview adds the answer when the selection includes the whole expression through `=`; Reading view uses ordinary text selection.

| Note text | Display with default settings |
| --- | --- |
| `2*3=` | `2*3=6.00` |
| `2 * 3 =` | `2 * 3 = 6.00` |
| `2+3*4=` | `2+3*4=14.00` |
| `(2+3)×4=` | `(2+3)×4=20.00` |
| `¥722*2+¥621*2=` | `¥722*2+¥621*2=¥2,686.00` |
| `¥2,686.00+¥1,000=` | `¥2,686.00+¥1,000=¥3,686.00` |
| `Stop Loss: 208.65 - 1.9874 * 1.5 =` | `Stop Loss: 208.65 - 1.9874 * 1.5 = 205.67` |

Supported operators are `+`, `-`/`−`, `*`/`×`, `/`/`÷`, `%` (remainder), and `^` (power). Parentheses and powers take precedence over multiplication/division/remainder, which precede addition/subtraction. Powers associate to the right.

Only lines ending in `=` followed by optional whitespace are considered. Existing answers such as `2*3=6` are left alone. Source mode does not show generated answers. Partial selections and Cut retain source-text behavior in Live Preview. To change precision, open **Settings → Community plugins → Note Calc → Decimal places**.

The renderers contain exclusions for code, math, frontmatter, and links, but use different DOM and syntax-tree checks. See [limitations and implementation details](TECHNICAL_DOCUMENTATION.md).

## Requirements

| Area | Repository evidence |
| --- | --- |
| Obsidian | `manifest.json` declares minimum app version `1.5.0`, plugin version `1.2.0`, and `isDesktopOnly: false`. This declaration is not a verified compatibility matrix. |
| Development runtime | The release workflow selects Node.js **22**. No root `engines`, npm version pin, or tool-version file is declared. Locked esbuild `0.25.12` requires Node.js `>=18`; Node.js 22 matches CI. |
| Package manager | npm; `package-lock.json` uses lockfile version 3. Use `npm ci` to install its locked dependency graph. |
| Build tools | Locked TypeScript `5.9.3` and esbuild `0.25.12`. Type checking uses the Obsidian API package `1.13.1`; CodeMirror is supplied by the Obsidian runtime. |
| Optional browser checks | A browser with DOM, Selection, PointerEvent, DataTransfer, ClipboardEvent, and CodeMirror support. The documented local server uses Python 3; no Python or browser version is pinned. Clipboard interaction also depends on the host's Clipboard API policy. |

No OS minimum, native SDK deployment target, Xcode target/scheme, or standalone application runtime is declared. Desktop/mobile behavior and compatibility with the declared minimum Obsidian version remain **Externally unverified** during this release preparation.

## Installation and setup

Use a checkout of this repository and run commands from its root, where `package.json` is located:

```bash
npm ci
npm run build
```

The build type-checks `src/` and bundles `src/main.ts` into `main.js`. It does not generate `manifest.json` or `styles.css`; those files already exist in the repository.

Copy these three files into `.obsidian/plugins/note-calc/` inside the intended vault:

- `main.js`
- `manifest.json`
- `styles.css`

Reload Obsidian or disable/re-enable Note Calc, then enable it under Community plugins as needed. Installation and host reload are manual; no install script is provided. No environment variables, API keys, certificates, backend setup, or credentials are required by the plugin source.

## Development and checks

| Command | Behavior |
| --- | --- |
| `npm run dev` | Starts esbuild watch mode and rewrites `main.js` with an inline source map; does not run TypeScript checking or reload Obsidian. |
| `npm run build` | Runs `tsc --noEmit --skipLibCheck`, then produces a minified CommonJS `main.js` targeting ES2018. |
| `npx --no-install tsc --noEmit --skipLibCheck` | Checks the configured `src/**/*.ts` files without rebuilding the bundle. |

There are no npm `test`, `lint`, or `format` scripts and no configured lint/format tools. The release workflow builds on tag pushes but does not run browser regression checks.

### Optional browser regression page

**Test-covered** describes the cases present in source; the fresh release-preparation result is recorded under Known limitations and evidence. It includes calculator cases, rendered-Markdown fixtures, actual CodeMirror views, and synthetic copy events. It does not load Obsidian or its Markdown parser.

After installing dependencies, prepare the page outside the repository:

```bash
mkdir -p /tmp/note-calc-regression
npx --no-install esbuild tests/regression.ts --bundle --outfile=/tmp/note-calc-regression/regression.js
cp tests/regression.html /tmp/note-calc-regression/index.html
cp styles.css /tmp/note-calc-regression/styles.css
python3 -m http.server 8765 --bind 127.0.0.1 --directory /tmp/note-calc-regression
```

Open `http://127.0.0.1:8765/`, inspect its pass/fail report, and stop the server with Ctrl-C. The interactive fixture lets you check whole-formula selection/copy and click-to-copy using real gestures. The page is a local test/demo path, not a production plugin mode. Preparing/running it is not part of `npm run build`.

## Project structure

| Path | Responsibility |
| --- | --- |
| [`src/main.ts`](src/main.ts) | Plugin lifecycle, settings, Obsidian integration, and clipboard notices. |
| [`src/calculator.ts`](src/calculator.ts) | Formula detection, parsing, validation, and formatting. |
| [`src/live-preview.ts`](src/live-preview.ts) | CodeMirror decorations, answer widgets, and selected-formula copying. |
| [`src/reading-view.ts`](src/reading-view.ts) | Rendered-line collection, Markdown source matching, and answer insertion. |
| [`src/answer.ts`](src/answer.ts) | Shared selectable answer elements and input interactions. |
| [`tests/`](tests/) | Browser regression source and HTML harness. |
| [`esbuild.config.mjs`](esbuild.config.mjs), [`tsconfig.json`](tsconfig.json) | Bundling and type-check configuration. |
| [`manifest.json`](manifest.json), [`versions.json`](versions.json), [`styles.css`](styles.css) | Plugin metadata, version compatibility declarations, and styles. |
| [`.github/workflows/release.yml`](.github/workflows/release.yml) | Tag-triggered build, asset attestation, and GitHub release configuration. |

## Known limitations and evidence

- JavaScript floating-point arithmetic and `toFixed()` rounding are used; this is not an arbitrary-precision or currency-conversion engine. `%` means remainder, not percentage.
- Grouped inputs require three digits after every comma. Decimal commas, mixed currency symbols, variables, functions, and locale selection are not implemented. For negative currency input, put the sign before the symbol, such as `-¥1,000`.
- Reading view restores hidden `*` characters only when it can match a candidate source line to rendered text. Unsupported Markdown transformations or unavailable section information can cause emphasized formulas to be skipped.
- Live Preview exclusions depend on Obsidian's syntax tree near the start of each line; the browser harness does not reproduce all host syntax nodes or plugin/theme interactions.
- Saved settings are shallow-merged with defaults without schema/range validation. There is no migration layer, answer cache, background service, telemetry, or plugin-owned cloud synchronization.
- Clipboard access, mobile gestures, accessibility behavior, actual Obsidian integration, cloud-vault synchronization, and publication of the new GitHub release remain **Externally unverified** here. There are no production feature flags or separate experimental runtime modes in the current source.

**Verified in this task (1.2.0 release preparation, 2026-11-03):** `npm run build`, explicit test-source TypeScript checking, `node --check main.js`, and the browser regression page (**85 passed, 0 failed**). Version/manifest/assets, lockfile dependency preservation, documentation, and whitespace checks also passed. This is a local release-preparation result, not an Obsidian compatibility or Community directory approval. The `1.2.0` tag/release remains unpublished pending confirmation. Suggested extensions are **Planned / Not implemented** recommendations in the [technical document](TECHNICAL_DOCUMENTATION.md#15-future-development).

## Community Plugins release preparation

The prepared version is **1.2.0**; see [release notes](CHANGELOG.md#120--unreleased). `manifest.json`, `package.json`, the lockfile root versions, and `versions.json` are aligned. The declared minimum Obsidian version remains `1.5.0`; manually validate host compatibility before publishing.

The [official submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin) requires a public source repository, README, license, manifest, and a GitHub release whose tag exactly matches the manifest version. For this release, the tag must be `1.2.0`, without a `v` prefix, and the assets are `main.js`, `manifest.json`, and `styles.css`.

Pushing any tag triggers this repository's workflow and publishes a GitHub release; it is not configured as a draft-only workflow. Tag creation/push therefore remains a separate confirmation step after committing the preparation changes. The workflow generates release notes automatically; the prepared changelog text is available for the final release description but is not injected by CI.

The [existing Community listing](https://community.obsidian.md/plugins/note-calc) was checked during preparation and displays version `1.1.1` under this repository owner. This is an update to an already listed plugin, so the initial submission flow is not required again. After the matching release and assets exist, confirm that the directory processes `1.2.0` and resolves any scanner feedback through the owning Community account. A version bump or GitHub release alone does not prove that the new version has passed review or appeared in the directory. No Community account changes or submission are performed by the local build.

## License

The project is licensed under the [MIT License](LICENSE), copyright 2026 Sunny Yu. Third-party packages retain their own licenses; `package-lock.json` records MIT, Apache-2.0, and 0BSD package licenses. The project license does not replace those terms.
