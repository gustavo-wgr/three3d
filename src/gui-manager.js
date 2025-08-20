export class GUIManager {
  constructor(gui, params, callbacks) {
    this.gui = gui;
    this.params = params;
    this.callbacks = callbacks;
  }

  setupGUI() {
    // Point cloud controls
    this.gui.add(this.params, "pointSize", 0.001, 0.02).onChange((value) => {
      if (this.callbacks.onPointSizeChange) {
        this.callbacks.onPointSizeChange(value);
      }
    });

    this.gui
      .add(this.params, "subsampleRate", 0.01, 1.0, 0.01)
      .name("Sample Rate")
      .onChange((value) => {
        if (this.callbacks.onSubsampleRateChange) {
          this.callbacks.onSubsampleRateChange(value);
        }
      });

    this.gui
      .add(this.params, "evaporationAmount", 0.001, 0.05, 0.001)
      .name("Evaporation %")
      .onChange((value) => {
        if (this.callbacks.onEvaporationAmountChange) {
          this.callbacks.onEvaporationAmountChange(value);
        }
      });

    this.gui
      .add(this.params, "evaporationSpeed", 0.02, 1.0, 0.01)
      .name("Evap. Speed")
      .onChange((value) => {
        if (this.callbacks.onEvaporationSpeedChange) {
          this.callbacks.onEvaporationSpeedChange(value);
        }
      });

    this.gui
      .add(this.params, "maxHeight", 0.5, 5.0, 0.1)
      .name("Max Height")
      .onChange((value) => {
        if (this.callbacks.onMaxHeightChange) {
          this.callbacks.onMaxHeightChange(value);
        }
      });

    this.gui
      .add(this.params, "evaporationEnabled")
      .name("Enable Effect")
      .onChange((value) => {
        if (this.callbacks.onEvaporationEnabledChange) {
          this.callbacks.onEvaporationEnabledChange(value);
        }
      });

    // Model scaling control
    this.gui
      .add(this.params, "modelScale", 0.01, 10.0, 0.01)
      .name("Model Scale")
      .onChange((value) => {
        if (this.callbacks.onModelScaleChange) {
          this.callbacks.onModelScaleChange(value);
        }
      });

    // GLB Options folder
    this.setupGLBOptions();

    // Background controls
    this.gui.add(this.params, "toggleBackground").name("Toggle Background");
    this.gui
      .add(this.params, "xrBlackBackground")
      .name("XR Black Background")
      .onChange((value) => {
        if (this.callbacks.onXRBackgroundModeChange) {
          this.callbacks.onXRBackgroundModeChange(value);
        }
      });

    // Morph option for video playback
    this.gui
      .add(this.params, "morphEnabled")
      .name("Morph Video Frames")
      .onChange((value) => {
        if (this.callbacks.onMorphToggle) {
          this.callbacks.onMorphToggle(value);
        }
      });

    // Video Playback Controls
    this.setupVideoControls();

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

  setupVideoControls() {
    const videoFolder = this.gui.addFolder("Video Playback");
    
    // Add video mode toggle
    videoFolder.add(this.params, "toggleVideoMode").name("Toggle Video Mode");
    
    // Add playback controls
    videoFolder.add(this.params, "playVideo").name("Play");
    videoFolder.add(this.params, "pauseVideo").name("Pause");
    videoFolder.add(this.params, "stopVideo").name("Stop");
    videoFolder.add(this.params, "nextFrame").name("Next Frame");
    videoFolder.add(this.params, "previousFrame").name("Previous Frame");
    
    // Add frame slider
    videoFolder.add(this.params, "currentVideoFrame", 0, 80, 1).name("Frame").onChange((value) => {
      if (this.callbacks.onVideoFrameChange) {
        this.callbacks.onVideoFrameChange(value);
      }
    });
    
    // Add playback speed control
    videoFolder.add(this.params, "playbackSpeed", 0.5, 4.0, 0.5).name("Speed (FPS)").onChange((value) => {
      if (this.callbacks.onPlaybackSpeedChange) {
        this.callbacks.onPlaybackSpeedChange(value);
      }
    });
    
    // Expand the folder by default
    videoFolder.open();
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

  updateCurrentVideoFrame(frameIndex) {
    this.params.currentVideoFrame = frameIndex;
  }
}
