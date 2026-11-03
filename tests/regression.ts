import { calculateLine } from "../src/calculator";
import { renderReadingViewCalculations } from "../src/reading-view";
import { createAnswerElement } from "../src/answer";
import { createNoteCalcLivePreviewExtension } from "../src/live-preview";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

let passed = 0;
let failed = 0;
const report = document.createElement("pre");
document.body.append(report);

function test(name: string, run: () => void): void {
  try {
    document.getSelection()?.removeAllRanges();
    run();
    passed += 1;
    report.textContent += `PASS ${name}\n`;
  } catch (error) {
    failed += 1;
    report.textContent += `FAIL ${name}: ${error}\n`;
  }
}

function equal(actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

for (const [formula, answer] of [
  ["¥722*2+¥621*2=", "¥2,686.00"],
  ["Total: ¥722*2+¥621*2=", "¥2,686.00"],
  ["$10+$5=", "$15.00"],
  ["€10*2=", "€20.00"],
  ["£10/4=", "£2.50"],
  ["¥10-¥20=", "¥-10.00"],
  ["-¥10+¥2=", "¥-8.00"],
  ["(¥722+¥621)*2=", "¥2,686.00"],
  ["2*3=", "6.00"],
  ["2+3*4=", "14.00"],
  ["(2+3)×4=", "20.00"],
  ["Stop Loss: 208.65 - 1.9874 * 1.5 =", "205.67"],
  ["2^3^2=", "512.00"],
  ["1e2+2=", "102.00"],
  ["¥2,686.00+¥1,000=", "¥3,686.00"],
  ["1,000+2,000=", "3,000.00"],
  ["1,234,567.89+0.11=", "1,234,568.00"],
  ["-¥2,686.50*2=", "¥-5,373.00"],
  ["(¥1,000+¥250)*2=", "¥2,500.00"],
  ["Total: ¥2,686.00+¥1,000=", "¥3,686.00"],
  ["Price 1,000+2=", "1,002.00"],
  ["1,234e-2+1=", "13.34"],
]) {
  test(formula, () => equal(calculateLine(formula, { decimalPlaces: 2 })?.answer, answer));
}
for (const formula of ["¥10+$20=", "¥10*2=¥20", "1/0+2=", "2+3=5", "text="]) {
  test(`skip ${formula}`, () => equal(calculateLine(formula, { decimalPlaces: 2 }), null));
}
test("currency decimal setting", () => equal(calculateLine("¥1/8=", { decimalPlaces: 3 })?.answer, "¥0.125"));
for (const formula of [
  "1,23+4=", "¥1,23+¥4=", "12,34,567+8=", "1234,567+8=",
  "1,,000+2=", ",123+4=", "1,000,+2=", "1, 000+2=",
  "1,000.1,2+3=", ".1,234+5=", "1e1,000+2=", "1,2e3+4=",
  "1,2e-3+4=", "Total: 1,23+4=",
]) {
  test(`reject invalid grouping: ${formula}`, () => equal(calculateLine(formula, { decimalPlaces: 2 }), null));
}
for (const [formula, decimalPlaces, expected] of [
  ["1000+234567=", 2, "235,567.00"],
  ["¥1000000*2=", 2, "¥2,000,000.00"],
  ["¥0-2686=", 2, "¥-2,686.00"],
  ["¥2686*1=", 0, "¥2,686"],
  ["¥2686.12345*1=", 4, "¥2,686.1235"],
  ["999.999*1=", 2, "1,000.00"],
  ["0-0.0000000000001=", 2, "0.00"],
] as const) {
  test(`grouping ${formula} (${decimalPlaces} decimals)`, () =>
    equal(calculateLine(formula, { decimalPlaces })?.answer, expected));
}

function fixture(html: string, source?: string, decimals = 2): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  const context = source === undefined ? undefined : {
    getSectionInfo: () => ({ text: source, lineStart: 0, lineEnd: source.split("\n").length - 1 }),
  };
  renderReadingViewCalculations(container, decimals, context);
  return container;
}

test("reported Markdown emphasis reproducer", () => {
  const container = fixture("<p>¥722<em>2+¥621</em>2=</p>", "¥722*2+¥621*2=");
  equal(container.textContent, "¥722*2+¥621*2=¥2,686.00");
  equal(container.querySelector(".note-calc-answer")?.getAttribute("aria-label"), "Calculated answer: ¥2,686.00");
  renderReadingViewCalculations(container, 2);
  equal(container.querySelectorAll(".note-calc-answer").length, 1);
});
test("currency formula without Markdown emphasis", () => {
  equal(fixture("<p>¥722×2+¥621×2=</p>").textContent, "¥722×2+¥621×2=¥2,686.00");
});
test("Reading view grouped operands", () => {
  equal(fixture("<p>¥2,686.00+¥1,000=</p>").textContent, "¥2,686.00+¥1,000=¥3,686.00");
});
test("Reading view grouped operands with hidden multiplication stars", () => {
  equal(fixture("<p>¥1,000<em>2+¥500</em>3=</p>", "¥1,000*2+¥500*3=").textContent,
    "¥1,000*2+¥500*3=¥3,500.00");
});
test("Reading view invalid grouping has no answer", () => {
  equal(fixture("<p>¥1,23+4=</p>").querySelectorAll(".note-calc-answer").length, 0);
});
test("restore noncurrency stars", () => {
  equal(fixture("<p>2<em>3+4</em>5=</p>", "2*3+4*5=").textContent, "2*3+4*5=26.00");
});
test("multiple soft lines in a paragraph", () => {
  equal(fixture("<p>¥722<em>2+¥621</em>2=\n2*3=\n4+5=</p>", "¥722*2+¥621*2=\n2*3=\n4+5=").textContent,
    "¥722*2+¥621*2=¥2,686.00\n2*3=6.00\n4+5=9.00");
});
test("hard breaks and separate paragraphs", () => {
  const container = fixture("<p>2*3=<br>4+5=</p><p>6+7=</p>");
  equal(container.querySelectorAll(".note-calc-answer").length, 3);
  equal(container.textContent, "2*3=6.004+5=9.006+7=13.00");
});
test("formatted prefix is preserved", () => {
  const container = fixture("<p><strong>Total:</strong> ¥722<em>2+¥621</em>2=</p>", "**Total:** ¥722*2+¥621*2=");
  equal(container.textContent, "Total: ¥722*2+¥621*2=¥2,686.00");
  equal(container.querySelector("strong")?.textContent, "Total:");
});
test("formula beside formatted prefix stays outside the formatting", () => {
  const container = fixture("<p><strong>Total:</strong>¥722<em>2+¥621</em>2=</p>", "**Total:**¥722*2+¥621*2=");
  equal(container.textContent, "Total:¥722*2+¥621*2=¥2,686.00");
  equal(container.querySelector("strong")?.textContent, "Total:");
  equal(container.querySelector("strong .note-calc-answer"), null);
});
for (const [html, source] of [
  ["<ul><li>¥722<em>2+¥621</em>2=</li></ul>", "- ¥722*2+¥621*2="],
  ["<h2>¥722<em>2+¥621</em>2=</h2>", "## ¥722*2+¥621*2="],
  ["<blockquote><p>¥722<em>2+¥621</em>2=</p></blockquote>", "> ¥722*2+¥621*2="],
  ["<table><tbody><tr><td>¥722<em>2+¥621</em>2=</td></tr></tbody></table>", "| ¥722*2+¥621*2= |"],
]) {
  test(`block source: ${source}`, () => equal(fixture(html, source).textContent, "¥722*2+¥621*2=¥2,686.00"));
}
for (const html of [
  "<p><code>2+3=</code></p>", "<pre>2+3=</pre>", "<p><a href='#'>2+3=</a></p>",
  "<p><code>2</code>+3=</p>", "<p><a href='#'>2</a>+3=</p>",
  "<div class='math'>2+3=</div>", "<div class='frontmatter'>2+3=</div>",
  "<p>¥722<em>2+¥621</em>2=</p>", "<p>2<em>3+4</em>5=</p>",
  "<p>2*3=6</p>",
]) {
  test(`excluded or unavailable source: ${html}`, () => equal(fixture(html).querySelectorAll(".note-calc-answer").length, 0));
}
test("source section boundaries", () => {
  const container = document.createElement("div");
  container.innerHTML = "<p>¥722<em>2+¥621</em>2=</p>";
  renderReadingViewCalculations(container, 2, {
    getSectionInfo: () => ({ text: "unrelated\n¥722*2+¥621*2=\nunrelated", lineStart: 1, lineEnd: 1 }),
  });
  equal(container.textContent, "¥722*2+¥621*2=¥2,686.00");
});
test("excluded container itself", () => {
  const container = document.createElement("code");
  container.textContent = "2+3=";
  renderReadingViewCalculations(container, 2);
  equal(container.textContent, "2+3=");
});
function selectText(node: Node, from = 0, to = node.textContent!.length): void {
  const selection = document.getSelection()!;
  selection.removeAllRanges();
  const range = document.createRange();
  range.setStart(node, from);
  range.setEnd(node, to);
  selection.addRange(range);
}

function editorFixture(text: string, preview = true, decimals = 2, copyAnswer = (_answer: string) => {}): EditorView {
  const parent = document.createElement("div");
  parent.style.display = "block";
  document.body.append(parent);
  return new EditorView({
    parent,
    state: EditorState.create({
      doc: text,
      extensions: [createNoteCalcLivePreviewExtension(() => decimals, () => preview, copyAnswer)],
    }),
  });
}

function copySelection(view: EditorView, from: number, to: number, type = "copy"): string {
  document.getSelection()!.removeAllRanges();
  view.dispatch({ selection: EditorSelection.single(from, to) });
  const data = new DataTransfer();
  const event = new ClipboardEvent(type, { clipboardData: data, bubbles: true, cancelable: true });
  view.contentDOM.dispatchEvent(event);
  return data.getData("text/plain");
}

test("Reading view whole formula and answer are selectable", () => {
  const container = fixture("<p>1+1=</p>", undefined, 0);
  container.style.display = "block";
  const selection = document.getSelection()!;
  selection.removeAllRanges();
  const range = document.createRange();
  range.selectNodeContents(container.querySelector("p")!);
  selection.addRange(range);
  equal(selection.toString(), "1+1=2");
  equal(getComputedStyle(container.querySelector(".note-calc-answer")!).userSelect, "text");
  selection.removeAllRanges();
});
test("Reading view answer can be copied by click and keyboard", () => {
  const copies: string[] = [];
  const container = document.createElement("div");
  container.innerHTML = "<p>¥1,000+¥2=</p>";
  document.body.append(container);
  renderReadingViewCalculations(container, 2, undefined, (answer) => copies.push(answer));
  const answer = container.querySelector<HTMLElement>(".note-calc-answer")!;
  answer.click();
  answer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  equal(copies.join("|"), "¥1,002.00|¥1,002.00");
});
test("dragging or selecting an answer does not trigger click-copy", () => {
  let copies = 0;
  const answer = createAnswerElement(document, "¥2,686.00", "", () => { copies += 1; });
  document.body.append(answer);
  selectText(answer.firstChild!, 0, 2);
  answer.click();
  equal(copies, 0);
  document.getSelection()!.removeAllRanges();
  answer.dispatchEvent(new PointerEvent("pointerdown", { clientX: 0, clientY: 0 }));
  answer.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 0 }));
  answer.click();
  equal(copies, 0);
});
test("Live Preview uses a real selectable answer and supports click-copy", () => {
  const copies: string[] = [];
  const view = editorFixture("1+1=", true, 0, (answer) => copies.push(answer));
  const answer = view.contentDOM.querySelector<HTMLElement>(".note-calc-answer")!;
  equal(answer.textContent, "2");
  equal(getComputedStyle(answer).userSelect, "text");
  answer.click();
  equal(copies.join("|"), "2");
  equal(view.state.doc.toString(), "1+1=");
  view.destroy();
});
test("Live Preview copy includes the answer and highlights it", () => {
  const view = editorFixture("1+1=", true, 0);
  equal(copySelection(view, 0, 4), "1+1=2");
  equal(view.contentDOM.querySelectorAll(".note-calc-answer-selected").length, 1);
  equal(view.state.doc.toString(), "1+1=");
  view.destroy();
});
test("Live Preview copies formatted currency and leaves partial selections alone", () => {
  const source = "Total: ¥1,000+¥2=";
  const view = editorFixture(source);
  equal(copySelection(view, 0, source.length), "Total: ¥1,000+¥2=¥1,002.00");
  equal(copySelection(view, 7, source.length), "¥1,000+¥2=¥1,002.00");
  equal(copySelection(view, 8, source.length), "1,000+¥2=");
  equal(copySelection(view, 0, 5), "Total");
  view.destroy();
});
test("Live Preview copies multiple lines and preserves existing answers", () => {
  const source = "1+1=\nplain text\n2*3=6\n¥1,000+¥2=";
  const view = editorFixture(source);
  equal(copySelection(view, 0, source.length), "1+1=2.00\nplain text\n2*3=6\n¥1,000+¥2=¥1,002.00");
  view.destroy();
});
test("Live Preview copies selected answer text without the expression", () => {
  const view = editorFixture("¥1,000+¥2=");
  const answer = view.contentDOM.querySelector(".note-calc-answer")!;
  selectText(answer.firstChild!);
  const data = new DataTransfer();
  view.contentDOM.dispatchEvent(new ClipboardEvent("copy", { clipboardData: data, bubbles: true, cancelable: true }));
  equal(data.getData("text/plain"), "¥1,002.00");
  document.getSelection()!.removeAllRanges();
  view.destroy();
});
test("Source mode copies only source text and shows no generated answer", () => {
  const view = editorFixture("1+1=", false);
  equal(view.contentDOM.querySelector(".note-calc-answer"), null);
  equal(copySelection(view, 0, 4), "1+1=");
  view.destroy();
});
test("cut keeps source semantics and does not insert generated answers", () => {
  const view = editorFixture("1+1=");
  equal(copySelection(view, 0, 4, "cut"), "1+1=");
  equal(view.state.doc.toString(), "");
  view.destroy();
});

const summary = document.createElement("h1");
summary.textContent = `${passed} passed, ${failed} failed`;
document.body.prepend(summary);
document.title = summary.textContent;

// Interactive fixture for checking real pointer/keyboard clipboard gestures.
const demo = document.createElement("div");
demo.style.display = "block";
const demoHeading = document.createElement("h2");
demoHeading.textContent = "Copy interaction check";
const status = document.createElement("p");
status.setAttribute("role", "status");
status.textContent = "Select the complete formula and copy, or click its answer.";
const demoView = new EditorView({
  state: EditorState.create({
    doc: "1+1=",
    extensions: [createNoteCalcLivePreviewExtension(() => 0, () => true, (answer) => {
      void navigator.clipboard.writeText(answer).then(() => { status.textContent = `Copied answer: ${answer}`; });
    })],
  }),
  parent: demo,
});
demoView.contentDOM.setAttribute("aria-label", "Live Preview formula");
demoView.contentDOM.addEventListener("copy", (event) => {
  status.textContent = `Copied selection: ${(event as ClipboardEvent).clipboardData?.getData("text/plain")}`;
});
demo.prepend(demoHeading);
demo.append(status);
summary.after(demo);
