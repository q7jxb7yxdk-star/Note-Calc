import { calculateLine } from "./calculator";

const EXCLUDED_ELEMENTS = new Set([
  "CODE",
  "PRE",
  "SCRIPT",
  "STYLE",
  "MATH",
  "A",
]);

export function renderReadingViewCalculations(
  container: HTMLElement,
  decimalPlaces: number,
): void {
  const doc = container.ownerDocument;
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (isEligibleTextNode(node)) {
      textNodes.push(node);
    }
  }

  for (const node of textNodes) {
    const result = calculateLine(node.data, { decimalPlaces });
    if (
      !result ||
      !node.parentNode ||
      (node.nextSibling instanceof HTMLElement &&
        node.nextSibling.classList.contains("note-calc-answer"))
    ) {
      continue;
    }

    const answer = doc.createElement("span");
    answer.className = "note-calc-answer";
    answer.textContent = result.answerPrefix + result.answer;
    answer.setAttribute(
      "aria-label",
      `Calculated answer: ${result.answer}`,
    );
    node.parentNode.insertBefore(answer, node.nextSibling);
  }
}

function isEligibleTextNode(node: Text): boolean {
  let element = node.parentElement;

  while (element) {
    if (
      EXCLUDED_ELEMENTS.has(element.tagName) ||
      element.classList.contains("math") ||
      element.classList.contains("math-block") ||
      element.classList.contains("math-inline") ||
      element.classList.contains("frontmatter") ||
      element.classList.contains("note-calc-answer")
    ) {
      return false;
    }
    element = element.parentElement;
  }

  return node.data.trim().length > 0;
}
