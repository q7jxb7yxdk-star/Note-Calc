import { Plugin } from "obsidian";

import { noteCalcLivePreviewExtension } from "./live-preview";
import { renderReadingViewCalculations } from "./reading-view";

export default class NoteCalcPlugin extends Plugin {
  onload(): void {
    this.registerEditorExtension(noteCalcLivePreviewExtension);
    this.registerMarkdownPostProcessor((element) => {
      renderReadingViewCalculations(element);
    });
  }
}
