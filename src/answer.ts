export type CopyAnswer = (answer: string) => void;

export function createAnswerElement(
  doc: Document,
  answer: string,
  prefix: string,
  copyAnswer?: CopyAnswer,
): HTMLSpanElement {
  const element = doc.createElement("span");
  element.className = "note-calc-answer";
  element.textContent = prefix + answer;
  element.setAttribute("aria-label", `Calculated answer: ${answer}`);
  if (!copyAnswer) return element;

  element.title = "Click to copy answer; drag to select text";
  element.setAttribute("role", "button");
  element.tabIndex = 0;
  let pointerStart: { x: number; y: number } | null = null;
  let dragged = false;
  element.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
    dragged = false;
  });
  element.addEventListener("pointermove", (event) => {
    if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 4) {
      dragged = true;
    }
  });
  element.addEventListener("click", (event) => {
    if (event.detail > 1 || dragged || !doc.getSelection()?.isCollapsed) return;
    copyAnswer(answer);
  });
  element.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    copyAnswer(answer);
  });
  return element;
}
