export class GUIManager {
  constructor(gui, params, callbacks) {
    this.gui = gui;
    this.params = params;
    this.callbacks = callbacks;
    this.controllers = {};
  }

  setupGUI() {
    // Point cloud controls
    this.controllers.pointSize = this.gui.add(this.params, "pointSize", 0.001, 0.02).onChange((value) => {
      if (this.callbacks.onPointSizeChange) {
        this.callbacks.onPointSizeChange(value);
      }
    });

    this.controllers.subsampleRate = this.gui
      .add(this.params, "subsampleRate", 0.01, 1.0, 0.01)
      .name("Sample Rate")
      .onChange((value) => {
        if (this.callbacks.onSubsampleRateChange) {
          this.callbacks.onSubsampleRateChange(value);
        }
      });

    this.controllers.modelScale = this.gui
      .add(this.params, "modelScale", 0.01, 10.0, 0.01)
      .name("Model Scale")
      .onChange((value) => {
        if (this.callbacks.onModelScaleChange) {
          this.callbacks.onModelScaleChange(value);
        }
      });

    // Model scaling control

    // GLB Options folder
    this.setupGLBOptions();

    // Preset Offset controls
    this.setupPresetOffsetControls();

    // Background controls
    //this.gui.add(this.params, "toggleBackground").name("Toggle Background");
    this.gui
      .add(this.params, "xrBlackBackground")
      .name("XR Black Background")
      .onChange((value) => {
        if (this.callbacks.onXRBackgroundModeChange) {
          this.callbacks.onXRBackgroundModeChange(value);
        }
      });

    this.gui
      .add(this.params, "coloredBackground")
      .name("Colored Background")
      .onChange((value) => {
        if (this.callbacks.onColoredBackgroundToggle) {
          this.callbacks.onColoredBackgroundToggle(value);
        }
      });

    // Color picker for background
    // dat.GUI supports color strings like '#ff00aa'
    this.controllers.backgroundColorPicker = this.gui
      .addColor(this.params, 'backgroundColorPicker')
      .name('Pick a Color')
      .onChange((value) => {
        if (this.callbacks.onBackgroundColorPick) {
          this.callbacks.onBackgroundColorPick(value);
        }
      });

    // Auto switch toggle
    this.gui
      .add(this.params, "autoSwitch")
      .name("Auto Switch (10s)")
      .onChange((value) => {
        if (this.callbacks.onAutoSwitchToggle) {
          this.callbacks.onAutoSwitchToggle(value);
        }
      });

    // Video playback removed

    // Position controls
    this.setupPositionControls();
  }

  setupGLBOptions() {
    const glbFolder = this.gui.addFolder("GLB Options");

    // Add folder selection
    const folderController = glbFolder
      .add(this.params, "selectedFolder", this.params.availableFolders)
      .name("Model Folder")
      .onChange((value) => {
        if (this.callbacks.onFolderChange) {
          this.callbacks.onFolderChange(value);
        }
      });

    // Add read-only display of current GLB
    const glbController = glbFolder
      .add(this.params, "currentGlb")
      .name("Current GLB")
      .listen();
    glbController.__input.readOnly = true;

    // Add button to switch to next GLB
    glbFolder.add(this.params, "switchToNextGlb").name("Switch to Next GLB");

    // Flip upside down toggle
    glbFolder
      .add(this.params, "flipUpsideDown")
      .name("Flip Upside Down")
      .onChange((value) => {
        if (this.callbacks.onFlipToggle) {
          this.callbacks.onFlipToggle(value);
        }
      });

    // Expand the folder by default
    glbFolder.open();
  }

  // Video controls removed

  setupPresetOffsetControls() {
    const offsetFolder = this.gui.addFolder("Preset Offset");

    this.controllers.presetOffsetX = offsetFolder
      .add(this.params, "presetOffsetX", -10.0, 10.0, 0.01)
      .name("X")
      .onChange((value) => {
        if (this.callbacks.onPresetOffsetChange) {
          this.callbacks.onPresetOffsetChange();
        }
      });

    this.controllers.presetOffsetY = offsetFolder
      .add(this.params, "presetOffsetY", -10.0, 10.0, 0.01)
      .name("Y")
      .onChange((value) => {
        if (this.callbacks.onPresetOffsetChange) {
          this.callbacks.onPresetOffsetChange();
        }
      });

    this.controllers.presetOffsetZ = offsetFolder
      .add(this.params, "presetOffsetZ", -10.0, 10.0, 0.01)
      .name("Z")
      .onChange((value) => {
        if (this.callbacks.onPresetOffsetChange) {
          this.callbacks.onPresetOffsetChange();
        }
      });

    offsetFolder.add(this.params, "resetPresetOffset").name("Reset Offset");

    offsetFolder.open();
  }

  setupPositionControls() {
    const posFolder = this.gui.addFolder("Position");

    posFolder
      .add(this.params, "positionStep", 0.01, 1.0, 0.01)
      .name("Step");

    posFolder.add(this.params, "moveUp").name("Up");
    posFolder.add(this.params, "moveDown").name("Down");
    posFolder.add(this.params, "moveLeft").name("Left");
    posFolder.add(this.params, "moveRight").name("Right");
    posFolder.add(this.params, "moveForward").name("Forward");
    posFolder.add(this.params, "moveBackward").name("Backward");
    posFolder.add(this.params, "resetPosition").name("Reset Position");

    posFolder.open();
  }

  updateCurrentGlb(glbName) {
    this.params.currentGlb = glbName;
  }

  // updateCurrentVideoFrame removed

  // Refresh displayed values for specific controllers after programmatic param changes
  updateDisplayFor(keys) {
    if (!Array.isArray(keys)) return;
    keys.forEach((key) => {
      const controller = this.controllers && this.controllers[key];
      if (controller && typeof controller.updateDisplay === 'function') {
        controller.updateDisplay();
      }
    });
  }
}
