import { syntaxTree } from "@codemirror/language";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";

import { calculateLine } from "./calculator";
import { CopyAnswer, createAnswerElement } from "./answer";

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

class AnswerWidget extends WidgetType {
  constructor(
    private readonly answer: string,
    private readonly prefix: string,
    private readonly selected: boolean,
    private readonly copyAnswer: CopyAnswer,
  ) { super(); }

  eq(other: AnswerWidget): boolean {
    return this.answer === other.answer && this.prefix === other.prefix &&
      this.selected === other.selected && this.copyAnswer === other.copyAnswer;
  }

  toDOM(view: EditorView): HTMLElement {
    const element = createAnswerElement(view.dom.ownerDocument, this.answer, this.prefix, this.copyAnswer);
    element.classList.toggle("note-calc-answer-selected", this.selected);
    return element;
  }

  ignoreEvent(): boolean { return true; }
}

export function createNoteCalcLivePreviewExtension(
  getDecimalPlaces: () => number,
  isLivePreview: (state: EditorState) => boolean,
  copyAnswer: CopyAnswer,
) {
  return [ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view, getDecimalPlaces(), isLivePreview(view.state), copyAnswer);
    }

    update(update: ViewUpdate): void {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        isLivePreview(update.startState) !== isLivePreview(update.state)
      ) {
        this.decorations = buildDecorations(update.view, getDecimalPlaces(), isLivePreview(update.state), copyAnswer);
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
  ), EditorView.domEventHandlers({
    copy(event, view) {
      if (!isLivePreview(view.state) || !event.clipboardData) return false;
      const selection = view.dom.ownerDocument.getSelection();
      const answerFor = (node: Node | null) =>
        (node?.nodeType === 1 ? node as Element : node?.parentElement)?.closest(".note-calc-answer");
      const selectedAnswer = answerFor(selection?.anchorNode ?? null);
      if (selection && !selection.isCollapsed && selectedAnswer &&
          view.contentDOM.contains(selectedAnswer) && selectedAnswer === answerFor(selection.focusNode)) {
        event.clipboardData.setData("text/plain", selection.toString());
        event.preventDefault();
        return true;
      }

      const ranges = view.state.selection.ranges.filter((range) => !range.empty);
      if (!ranges.length) return false;
      let changed = false;
      const text = ranges.map((range) => {
        let copied = "";
        let position = range.from;
        let line = view.state.doc.lineAt(range.from);
        while (line.from <= range.to) {
          const result = calculateLine(line.text, { decimalPlaces: getDecimalPlaces() });
          if (result && range.from <= line.from + result.expressionFrom &&
              range.to >= line.from + result.equalsTo && !isExcludedPosition(view, line.from, line.to)) {
            const end = line.from + result.equalsTo;
            copied += view.state.sliceDoc(position, end) + result.answerPrefix + result.answer;
            position = end;
            changed = true;
          }
          if (line.number === view.state.doc.lines) break;
          line = view.state.doc.line(line.number + 1);
        }
        return copied + view.state.sliceDoc(position, range.to);
      }).join(view.state.lineBreak);
      if (!changed) return false;
      event.clipboardData.setData("text/plain", text);
      event.preventDefault();
      return true;
    },
  })];
}

function buildDecorations(
  view: EditorView,
  decimalPlaces: number,
  isLivePreview: boolean,
  copyAnswer: CopyAnswer,
): DecorationSet {
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
          const answerPosition = line.from + result.equalsTo;
          const selected = view.state.selection.ranges.some((range) =>
            !range.empty && range.from <= line.from + result.expressionFrom && range.to >= answerPosition);
          builder.add(answerPosition, answerPosition, Decoration.widget({
            widget: new AnswerWidget(result.answer, result.answerPrefix, selected, copyAnswer),
            side: 1,
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
