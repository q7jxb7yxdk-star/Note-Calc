import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

import { createNoteCalcLivePreviewExtension } from "./live-preview";
import { renderReadingViewCalculations } from "./reading-view";

interface NoteCalcSettings {
  decimalPlaces: number;
}

const DEFAULT_SETTINGS: NoteCalcSettings = {
  decimalPlaces: 2,
};

const DECIMAL_PLACE_OPTIONS = [0, 1, 2, 3, 4];

export default class NoteCalcPlugin extends Plugin {
  settings: NoteCalcSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new NoteCalcSettingTab(this.app, this));

    this.registerEditorExtension(createNoteCalcLivePreviewExtension(
      () => this.settings.decimalPlaces,
    ));
    this.registerMarkdownPostProcessor((element) => {
      renderReadingViewCalculations(element, this.settings.decimalPlaces);
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.loadData()),
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.app.workspace.updateOptions();
  }
}

class NoteCalcSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: NoteCalcPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Decimal places")
      .setDesc("Choose how many decimal places calculation results show.")
      .addDropdown((dropdown) => {
        for (const decimalPlaces of DECIMAL_PLACE_OPTIONS) {
          dropdown.addOption(
            decimalPlaces.toString(),
            decimalPlaces.toString(),
          );
        }

        dropdown
          .setValue(this.plugin.settings.decimalPlaces.toString())
          .onChange(async (value) => {
            this.plugin.settings.decimalPlaces = Number(value);
            await this.plugin.saveSettings();
          });
      });
  }
}
