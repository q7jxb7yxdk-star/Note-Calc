import type { MarkdownPostProcessorContext } from "obsidian";

import { calculateLine } from "./calculator";
import { CopyAnswer, createAnswerElement } from "./answer";

const EXCLUDED_ELEMENTS = new Set([
  "CODE", "PRE", "SCRIPT", "STYLE", "MATH", "A",
]);
const BLOCK_ELEMENTS = new Set([
  "P", "DIV", "LI", "UL", "OL", "BLOCKQUOTE", "SECTION", "ARTICLE",
  "H1", "H2", "H3", "H4", "H5", "H6", "TABLE", "THEAD", "TBODY",
  "TFOOT", "TR", "TD", "TH",
]);

interface TextPart {
  node: Text;
  from: number;
  to: number;
}

interface RenderedLine {
  parts: TextPart[];
  text: string;
  excluded: boolean;
  emphasis: boolean;
}

export function renderReadingViewCalculations(
  container: HTMLElement,
  decimalPlaces: number,
  context?: Pick<MarkdownPostProcessorContext, "getSectionInfo">,
  copyAnswer?: CopyAnswer,
): void {
  // Snapshot complete visual lines before changing the DOM. Markdown emphasis
  // can split a single formula into several text nodes and remove its stars.
  for (const line of collectLines(container).reverse()) {
    if (line.excluded || !line.text.trimEnd().endsWith("=")) {
      continue;
    }

    const section = context?.getSectionInfo(line.parts[0].node.parentElement!);
    const sourceLines = section
      ? section.text.split("\n").slice(section.lineStart, section.lineEnd + 1)
      : [];
    let formula = line.text;
    let offsets: number[] | null = null;

    for (const sourceLine of sourceLines) {
      for (const candidate of sourceCandidates(sourceLine)) {
        const mapping = matchSource(candidate, line.text);
        if (mapping && calculateLine(candidate, { decimalPlaces })) {
          formula = candidate;
          offsets = mapping;
          break;
        }
      }
      if (offsets) break;
    }

    // Without matching source, emphasis may have swallowed an operator. Never
    // calculate the remaining text as though it were the original expression.
    if (!offsets && line.emphasis) continue;

    const result = calculateLine(formula, { decimalPlaces });
    if (!result) continue;

    const doc = container.ownerDocument;
    const range = doc.createRange();
    const from = locateOffset(line.parts, offsets?.[result.expressionFrom] ?? result.expressionFrom, true);
    const to = locateOffset(line.parts, line.text.length);
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset);

    const answer = createAnswerElement(doc, result.answer, result.answerPrefix, copyAnswer);

    const replacement = doc.createDocumentFragment();
    replacement.append(doc.createTextNode(formula.slice(result.expressionFrom)), answer);
    range.deleteContents();
    range.insertNode(replacement);
  }
}

function collectLines(container: HTMLElement): RenderedLine[] {
  const lines: RenderedLine[] = [];
  let current: RenderedLine;
  const flush = () => {
    if (current?.parts.length) lines.push(current);
    current = { parts: [], text: "", excluded: false, emphasis: false };
  };
  flush();

  const visit = (node: Node, emphasis: boolean): void => {
    if (node.nodeType === 3) {
      const text = node as Text;
      let from = 0;
      for (const segment of text.data.split("\n")) {
        if (segment.length) {
          current.parts.push({ node: text, from, to: from + segment.length });
          current.text += segment;
          current.emphasis ||= emphasis;
        }
        from += segment.length + 1;
        if (from <= text.data.length) flush();
      }
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node as HTMLElement;
    const block = BLOCK_ELEMENTS.has(element.tagName);
    if (block || element.tagName === "BR") flush();
    if (isExcludedElement(element)) {
      current.excluded = true;
    } else {
      for (const child of Array.from(element.childNodes)) {
        visit(child, emphasis || element.tagName === "EM" || element.tagName === "STRONG");
      }
    }
    if (block) flush();
  };

  // The postprocessor's container can itself be an excluded element.
  for (let element: HTMLElement | null = container; element; element = element.parentElement) {
    if (isExcludedElement(element)) return [];
  }
  visit(container, false);
  flush();
  return lines;
}

function isExcludedElement(element: HTMLElement): boolean {
  return EXCLUDED_ELEMENTS.has(element.tagName) ||
    ["math", "math-block", "math-inline", "frontmatter", "note-calc-answer"]
      .some((name) => element.classList.contains(name));
}

function sourceCandidates(source: string): string[] {
  const line = source
    .replace(/^\s*(?:>\s*)*/, "")
    .replace(/^(?:[-+*]|\d+[.)])\s+/, "")
    .replace(/^\[[ xX]\]\s+/, "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/\s+#+\s*$/, "");
  return [line, ...line.split("|").map((cell) => cell.trim())];
}

// Map raw offsets to rendered offsets, allowing only Markdown's removal of '*'.
// Exact matching keeps source recovery conservative around other Markdown syntax.
function matchSource(source: string, rendered: string): number[] | null {
  const offsets: number[] = [];
  let position = 0;
  for (let index = 0; index < source.length; index += 1) {
    offsets.push(position);
    if (source[index] === rendered[position]) {
      position += 1;
    } else if (source[index] !== "*") {
      return null;
    }
  }
  offsets.push(position);
  return position === rendered.length ? offsets : null;
}

function locateOffset(parts: TextPart[], offset: number, preferNext = false): { node: Text; offset: number } {
  for (const part of parts) {
    const length = part.to - part.from;
    if (offset < length || (offset === length && !preferNext)) {
      return { node: part.node, offset: part.from + offset };
    }
    offset -= length;
  }
  const last = parts[parts.length - 1];
  return { node: last.node, offset: last.to };
}
