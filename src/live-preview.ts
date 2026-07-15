import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { editorLivePreviewField } from "obsidian";

import { calculateLine } from "./calculator";

const EXCLUDED_NODE_NAMES = [
  "code",
  "math",
  "frontmatter",
  "yaml",
  "hashtag",
  "hmd-internal-link",
  "url",
];

class OperatorWidget extends WidgetType {
  toDOM(view: EditorView): HTMLElement {
    const span = view.dom.ownerDocument.createElement("span");
    span.className = "note-calc-operator-widget";
    span.textContent = "*";
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export function createNoteCalcLivePreviewExtension(
  getDecimalPlaces: () => number,
) {
  return ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view, getDecimalPlaces());
    }

    update(update: ViewUpdate): void {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        livePreviewChanged(update)
      ) {
        this.decorations = buildDecorations(update.view, getDecimalPlaces());
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
  );
}

function buildDecorations(
  view: EditorView,
  decimalPlaces: number,
): DecorationSet {
  const isLivePreview = Boolean(
    view.state.field(editorLivePreviewField, false),
  );
  const builder = new RangeSetBuilder<Decoration>();

  for (const range of view.visibleRanges) {
    let line = view.state.doc.lineAt(range.from);
    const finalLine = view.state.doc.lineAt(range.to).number;

    while (line.number <= finalLine) {
      const result = calculateLine(line.text, { decimalPlaces });
      if (
        result &&
        !isExcludedPosition(view, line.from, line.to)
      ) {
        builder.add(
          line.from,
          line.from,
          Decoration.line({
            class: "note-calc-expression",
          }),
        );

        addOperatorDecorations(
          builder,
          line.text,
          line.from,
          result.expressionFrom,
          result.expressionTo,
          isLivePreview,
          selectionTouchesLine(view, line.from, line.to),
        );

        if (isLivePreview) {
          builder.add(line.from + result.equalsFrom, line.from + result.equalsTo, Decoration.mark({
            class: "note-calc-equals",
            attributes: {
              "data-note-calc-answer": result.answerPrefix + result.answer,
              "aria-label": `Equals ${result.answer}`,
            },
          }));
        }
      }

      if (line.number === finalLine) {
        break;
      }
      line = view.state.doc.line(line.number + 1);
    }
  }

  return builder.finish();
}

function addOperatorDecorations(
  builder: RangeSetBuilder<Decoration>,
  text: string,
  lineFrom: number,
  expressionFrom: number,
  expressionTo: number,
  isLivePreview: boolean,
  isActiveLine: boolean,
): void {
  for (let index = expressionFrom; index < expressionTo; index += 1) {
    if (text[index] !== "*") {
      continue;
    }

    const from = lineFrom + index;
    if (isLivePreview && !isActiveLine) {
      builder.add(from + 1, from + 1, Decoration.widget({
        widget: new OperatorWidget(),
        side: 1,
      }));
    } else {
      builder.add(from, from + 1, Decoration.mark({
        class: "note-calc-operator",
      }));
    }
  }
}

function selectionTouchesLine(
  view: EditorView,
  lineFrom: number,
  lineTo: number,
): boolean {
  return view.state.selection.ranges.some(
    (range) => range.from <= lineTo && range.to >= lineFrom,
  );
}

function isExcludedPosition(
  view: EditorView,
  from: number,
  to: number,
): boolean {
  let node = syntaxTree(view.state).resolveInner(Math.min(from + 1, to), 1);

  while (node) {
    const name = node.name.toLowerCase();
    if (EXCLUDED_NODE_NAMES.some((excluded) => name.includes(excluded))) {
      return true;
    }
    if (!node.parent) {
      break;
    }
    node = node.parent;
  }

  return false;
}

function livePreviewChanged(update: ViewUpdate): boolean {
  return update.startState.field(editorLivePreviewField, false) !==
    update.state.field(editorLivePreviewField, false);
}
