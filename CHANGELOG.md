# Changelog

## 1.2.0 — Unreleased

Prepared for publication; the `1.2.0` tag and GitHub release have not been created. The existing tag-triggered workflow will build and publish the release after tag approval and push. This section provides release notes; the workflow currently generates GitHub release notes independently rather than reading this file automatically.

### Added

- Currency-symbol inputs and answers, such as `¥722*2+¥621*2=¥2,686.00`.
- Thousands separators in answers and valid grouped numeric inputs, such as `¥2,686.00+¥1,000=¥3,686.00`.
- Click-to-copy answers, with keyboard activation and clipboard success/failure notices.
- Selectable formula/answer text in Reading view and complete-formula copy support in Live Preview.
- Browser regression fixtures covering the calculator, Reading view DOM, CodeMirror views, selection, copying, and Cut behavior.

### Fixed

- Reading view formulas whose multiplication stars were consumed as Markdown emphasis, causing hidden operators and calculations of isolated trailing text.
- Tested malformed comma-grouping cases that could otherwise be interpreted as a valid numeric suffix.
- Live Preview answers now occupy actual inline layout space through answer widgets instead of CSS-generated text.

### Documentation

- Expanded developer setup, architecture, configuration, limitations, validation evidence, and Community Plugins publication instructions.

### Release validation — 2026-11-03

- Passed `npm run build`, explicit test-source TypeScript checking, and `node --check main.js`.
- Browser regression page: **85 passed, 0 failed**.
- Version alignment, release asset presence, manifest fields, document links, lockfile dependency preservation, and whitespace checks passed during preparation.
- Declared minimum Obsidian version remains `1.5.0`; this preparation does not establish minimum-version compatibility. Obsidian desktop/mobile integration, cloud-vault propagation, Community directory acceptance of `1.2.0`, and the new release workflow run still require external validation.

The existing [Community listing](https://community.obsidian.md/plugins/note-calc) was confirmed at `1.1.1`; `1.2.0` is an update to that listing, not a new initial submission.

## Earlier releases

Published release notes for `1.1.1`, `1.0.1`, and `1.0.0` are available in [GitHub Releases](https://github.com/q7jxb7yxdk-star/Note-Calc/releases).
