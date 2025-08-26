import * as THREE from "three";
import { SceneSetup } from "./scene-setup.js";
import { PointcloudManager } from "./pointcloud-manager.js";
import { GUIManager } from "./gui-manager.js";
import { getModelUrls, getAvailableFolders, getModelPositionPreset, getModelRenderPreset } from "./config.js";

export class MainApplication {
  constructor() {
    this.sceneSetup = null;
    this.pointcloudManager = null;
    this.guiManager = null;
    this.modelPosition = { x: 0, y: 2.1, z: -3 };
    this.baseModelPosition = { x: 0, y: 2.1, z: -3 };
    
    // State variables
    this.selectedFolder = 'unik3d';
    this.glbFiles = [];
    this.currentGlbIndex = 0;
    this.autoSwitchEnabled = true;
    this.autoSwitchDelayMs = 2000;
    this.autoSwitchTimer = null;
    
    // Parameters for GUI
    this.params = {
      pointSize: 0.006,
      subsampleRate: 0.06,
      modelScale: 1.0,
      flipUpsideDown: false,
      xrBlackBackground: false,
      coloredBackground: false,
      backgroundColorPicker: '#0a0a0a',
      selectedFolder: this.selectedFolder,
      currentGlb: '',
      availableFolders: getAvailableFolders(),
      toggleBackground: () => this.sceneSetup.toggleBackground(),
      switchToNextGlb: () => this.switchToNextGlb(),
      switchFolder: () => this.switchFolder(),
      autoSwitch: this.autoSwitchEnabled,
      // Positioning
      positionStep: 0.1,
      moveUp: () => this.nudgeModel(0, this.params.positionStep, 0),
      moveDown: () => this.nudgeModel(0, -this.params.positionStep, 0),
      moveLeft: () => this.nudgeModel(-this.params.positionStep, 0, 0),
      moveRight: () => this.nudgeModel(this.params.positionStep, 0, 0),
      moveForward: () => this.nudgeModel(0, 0, -this.params.positionStep),
      moveBackward: () => this.nudgeModel(0, 0, this.params.positionStep),
      resetPosition: () => this.resetModelPosition(),
      // Preset Offset
      presetOffsetX: 0.0,
      presetOffsetY: 0.0,
      presetOffsetZ: 0.0,
      resetPresetOffset: () => {
        this.params.presetOffsetX = 0.0;
        this.params.presetOffsetY = 0.0;
        this.params.presetOffsetZ = 0.0;
        if (this.guiManager && typeof this.guiManager.updateDisplayFor === 'function') {
          this.guiManager.updateDisplayFor(['presetOffsetX', 'presetOffsetY', 'presetOffsetZ']);
        }
        if (this.callbacks && typeof this.callbacks.onPresetOffsetChange === 'function') {
          this.callbacks.onPresetOffsetChange();
        }
      },
    };

    // Bind handlers
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onXRSessionStart = this.onXRSessionStart.bind(this);
    this.onXRSessionEnd = this.onXRSessionEnd.bind(this);
  }

  async initialize() {
    // Initialize scene setup
    this.sceneSetup = new SceneSetup();
    this.sceneSetup.initialize();

    // Initialize pointcloud manager
    this.pointcloudManager = new PointcloudManager(this.sceneSetup.scene);


    // Initialize GUI
    const gui = new dat.GUI();
    this.callbacks = this.getGUICallbacks(); // Store callbacks for later use
    this.guiManager = new GUIManager(gui, this.params, this.callbacks);
    this.guiManager.setupGUI();

    // Setup XR event listeners for auto-switch
    this.setupXREventListeners();

    // Setup survey completed callback to handle phase transitions
    this.sceneSetup.setSurveyCompletedCallback(() => this.handleSurveyCompletion());

    // Keyboard listener for quick actions
    document.addEventListener('keydown', this.onKeyDown);

    // Initialize with default folder
    this.glbFiles = getModelUrls(this.selectedFolder);
    this.params.currentGlb = this.glbFiles[0];

    // Load initial model
    this.loadGlbModel(this.glbFiles[this.currentGlbIndex]);

    // Start animation loop
    this.animate();
  }

  setupXREventListeners() {
    // Listen for XR session start to activate auto-switch
    this.sceneSetup.renderer.xr.addEventListener("sessionstart", this.onXRSessionStart);

    // Listen for XR session end to deactivate auto-switch
    this.sceneSetup.renderer.xr.addEventListener("sessionend", this.onXRSessionEnd);
  }

  startAutoSwitchTimer() {
    // Clear any existing timer first
    if (this.autoSwitchTimer) {
      clearTimeout(this.autoSwitchTimer);
    }
    this.autoSwitchTimer = setTimeout(() => {
      this.switchToNextGlb();
    }, this.autoSwitchDelayMs);
    console.log("Auto-switch timer started");
  }

  onXRSessionStart() {
    console.log("XR session started - checking auto-switch");
    // Hide completion overlays since user is entering VR
    this.sceneSetup.hidePhase1FinishedOverlay();
    this.sceneSetup.hideThankYouOverlay();

    // If no model is currently loaded, lazily load the first one for this phase
    const hasPointCloud = this.pointcloudManager && this.pointcloudManager.getPointCloud && this.pointcloudManager.getPointCloud();
    if (!hasPointCloud && this.glbFiles.length > 0) {
      this.loadGlbModel(this.glbFiles[this.currentGlbIndex]);
    }

    // Start auto-switch timer if enabled and we have models
    if (this.autoSwitchEnabled && this.glbFiles.length > 0) {
      this.startAutoSwitchTimer();
    }
  }

  onXRSessionEnd() {
    console.log("XR session ended - clearing auto-switch timer");
    // Clear auto-switch timer when leaving VR
    if (this.autoSwitchTimer) {
      clearTimeout(this.autoSwitchTimer);
      this.autoSwitchTimer = null;
    }
    // Clear any currently displayed model so survey overlay shows without background content
    if (this.pointcloudManager && typeof this.pointcloudManager.clearPointCloud === 'function') {
      this.pointcloudManager.clearPointCloud();
    }
  }

  onKeyDown(event) {
    if (!event || !event.key) return;
    if (event.key === 'r' || event.key === 'R') {
      const pos = this.modelPosition;
      console.log(
        `Current model position: { x: ${pos.x.toFixed(3)}, y: ${pos.y.toFixed(3)}, z: ${pos.z.toFixed(3)} }`
      );
    }
  }

  nudgeModel(dx, dy, dz) {
    const nx = this.modelPosition.x + dx;
    const ny = this.modelPosition.y + dy;
    const nz = this.modelPosition.z + dz;
    this.modelPosition = { x: nx, y: ny, z: nz };
    this.pointcloudManager.updatePointCloudPosition(nx, ny, nz);
  }

  resetModelPosition() {
    const defaultPos = { x: 0, y: 2.1, z: -3 };
    this.modelPosition = { ...defaultPos };
    this.pointcloudManager.updatePointCloudPosition(defaultPos.x, defaultPos.y, defaultPos.z);
  }

  getGUICallbacks() {
    return {
      onPointSizeChange: (value) => {
        if (this.pointcloudManager.getMaterial()) {
          this.pointcloudManager.getMaterial().uniforms.pointSize.value = value;
        }
      },
      onSubsampleRateChange: (value) => {
        if (this.pointcloudManager.originalGeometry) {
          this.updatePointCloudSampling(value);
        }
      },
      onFolderChange: (value) => {
        this.selectedFolder = value;
        this.glbFiles = getModelUrls(this.selectedFolder);
        this.currentGlbIndex = 0;
        this.params.currentGlb = this.glbFiles[0];
        this.loadGlbModel(this.glbFiles[this.currentGlbIndex]);
      },
      onAutoSwitchToggle: (value) => {
        this.autoSwitchEnabled = !!value;
        this.params.autoSwitch = this.autoSwitchEnabled;
        if (!this.autoSwitchEnabled && this.autoSwitchTimer) {
          clearTimeout(this.autoSwitchTimer);
          this.autoSwitchTimer = null;
        } else if (this.autoSwitchEnabled && this.sceneSetup.isInXRSession) {
          // If enabling auto-switch and we're already in VR, start the timer
          this.startAutoSwitchTimer();
        }
      },
      onXRBackgroundModeChange: (value) => {
        if (this.sceneSetup) {
          this.sceneSetup.setXRBlackBackgroundEnabled(!!value);
        }
      },
      onBackgroundColorPick: (value) => {
        this.params.coloredBackground = true;
        if (this.guiManager && typeof this.guiManager.updateDisplayFor === 'function') {
          this.guiManager.updateDisplayFor(['coloredBackground']);
        }
        if (this.sceneSetup) {
          this.sceneSetup.setColoredBackgroundEnabled(true, value);
        }
      },
      onColoredBackgroundToggle: (value) => {
        if (this.sceneSetup) {
          const urlParts = (this.params.currentGlb || '').split('/');
          const fileName = urlParts[urlParts.length - 1];
          const preset = getModelRenderPreset(this.selectedFolder, fileName);
          const bg = preset && preset.backgroundColor;
          this.sceneSetup.setColoredBackgroundEnabled(!!value, bg);
        }
      },
      onModelScaleChange: (value) => {
        if (this.pointcloudManager) {
          this.pointcloudManager.updatePointCloudScale(value);
        }
      }
      ,
      onFlipToggle: (value) => {
        if (this.pointcloudManager) {
          this.pointcloudManager.setFlipUpsideDown(!!value);
        }
      }
      ,
      onPresetOffsetChange: () => {
        // Recompute model position as base (preset or default) plus offsets
        const offsetX = this.params.presetOffsetX || 0;
        const offsetY = this.params.presetOffsetY || 0;
        const offsetZ = this.params.presetOffsetZ || 0;
        const nx = this.baseModelPosition.x + offsetX;
        const ny = this.baseModelPosition.y + offsetY;
        const nz = this.baseModelPosition.z + offsetZ;
        this.modelPosition = { x: nx, y: ny, z: nz };
        if (this.pointcloudManager) {
          this.pointcloudManager.updatePointCloudPosition(nx, ny, nz);
        }
      }
    };
  }

  loadGlbModel(glbUrl) {
    // Apply per-model preset position if defined
    try {
      const urlParts = glbUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const preset = getModelPositionPreset(this.selectedFolder, fileName);
      if (preset && isFinite(preset.x) && isFinite(preset.y) && isFinite(preset.z)) {
        this.baseModelPosition = { x: preset.x, y: preset.y, z: preset.z };
      }
      else {
        this.baseModelPosition = { x: 0, y: 2.1, z: -3 };
      }

      // Apply preset offsets to compute final model position
      const offsetX = this.params.presetOffsetX || 0;
      const offsetY = this.params.presetOffsetY || 0;
      const offsetZ = this.params.presetOffsetZ || 0;
      this.modelPosition = {
        x: this.baseModelPosition.x + offsetX,
        y: this.baseModelPosition.y + offsetY,
        z: this.baseModelPosition.z + offsetZ
      };

      // Apply per-model render presets if defined
      const renderPreset = getModelRenderPreset(this.selectedFolder, fileName);
      if (renderPreset && typeof renderPreset === 'object') {
        if (isFinite(renderPreset.pointSize)) {
          this.params.pointSize = renderPreset.pointSize;
        }
        if (isFinite(renderPreset.subsampleRate)) {
          this.params.subsampleRate = renderPreset.subsampleRate;
        }
        if (isFinite(renderPreset.modelScale)) {
          this.params.modelScale = renderPreset.modelScale;
        }

        // Refresh GUI controls to reflect updated preset values
        if (this.guiManager && typeof this.guiManager.updateDisplayFor === 'function') {
          this.guiManager.updateDisplayFor(['pointSize', 'subsampleRate', 'modelScale']);
        }
      }
    } catch (e) {
      // Non-fatal: fall back to current position
      console.warn('Preset position check failed for', glbUrl, e);
    }

    this.pointcloudManager.loadGlbModel(glbUrl, this.params, (pointCloud, frameIndex) => {
      // Callback when model is loaded
      const position = this.modelPosition;
      this.pointcloudManager.updatePointCloudPosition(position.x, position.y, position.z);

      // Apply current flip upside down setting
      this.pointcloudManager.setFlipUpsideDown(this.params.flipUpsideDown);

      // If colored background is enabled, update background color using lowest-Z color
      if (this.params.coloredBackground && this.sceneSetup) {
        try {
          const urlParts = (this.params.currentGlb || '').split('/');
          const fileName = urlParts[urlParts.length - 1];
          const preset = getModelRenderPreset(this.selectedFolder, fileName);
          const bg = preset && preset.backgroundColor;
          this.sceneSetup.setColoredBackgroundEnabled(true, bg);
        } catch (e) {
          // Non-fatal
        }
      }

      // Start or reset auto-switch timer after model is displayed (only in VR)
      if (this.autoSwitchTimer) {
        clearTimeout(this.autoSwitchTimer);
      }
      if (this.autoSwitchEnabled && this.sceneSetup.isInXRSession) {
        this.startAutoSwitchTimer();
      }
    });
  }

  updatePointCloudSampling(rate) {
    this.pointcloudManager.updatePointCloudSampling(rate, this.params, this.modelPosition);
  }

  switchToNextGlb() {
    const atEnd = this.currentGlbIndex >= this.glbFiles.length - 1;
    if (atEnd) {
      // At end: if in XR, end session; otherwise wrap to first
      if (this.sceneSetup && this.sceneSetup.renderer && this.sceneSetup.renderer.xr && this.sceneSetup.renderer.xr.isPresenting) {
        this.sceneSetup.endXRSession && this.sceneSetup.endXRSession();
        return;
      } else {
        this.currentGlbIndex = 0;
      }
    } else {
      this.currentGlbIndex += 1;
    }
    this.params.currentGlb = this.glbFiles[this.currentGlbIndex];
    this.loadGlbModel(this.params.currentGlb);
  }

  switchFolder() {
    this.selectedFolder = this.selectedFolder === 'unik3d' ? 'vggt' : 'unik3d';
    this.params.selectedFolder = this.selectedFolder;

    // Auto-enable flip upside down and adjust settings when switching to vggt folder
    if (this.selectedFolder === 'vggt') {
      this.params.flipUpsideDown = true;
      this.params.subsampleRate = 1.0;
      this.params.pointSize = 0.003;

      // Apply the changes immediately
      if (this.callbacks.onPointSizeChange) {
        this.callbacks.onPointSizeChange(0.003);
      }
      if (this.callbacks.onSubsampleRateChange) {
        this.callbacks.onSubsampleRateChange(1.0);
      }

      console.log('Auto-enabled flip upside down and adjusted sampling rate to 1.0, point size to 0.003 for vggt folder');
    } else {
      this.params.flipUpsideDown = false;
      this.params.subsampleRate = 0.06; // Reset to default
      this.params.pointSize = 0.006;    // Reset to default

      // Apply the changes immediately
      if (this.callbacks.onPointSizeChange) {
        this.callbacks.onPointSizeChange(0.006);
      }
      if (this.callbacks.onSubsampleRateChange) {
        this.callbacks.onSubsampleRateChange(0.06);
      }

      console.log('Disabled flip upside down and reset to default settings for unik3d folder');
    }

    this.glbFiles = getModelUrls(this.selectedFolder);
    this.currentGlbIndex = 0;
    this.params.currentGlb = this.glbFiles[0];
    this.loadGlbModel(this.glbFiles[this.currentGlbIndex]);
  }

  handleSurveyCompletion() {
    console.log('Survey completed - checking which phase finished');

    // Check which folder was just completed
    if (this.selectedFolder === 'unik3d') {
      // Phase 1 completed - switch to vggt and show phase 1 message
      console.log('Phase 1 completed - switching to vggt folder');
      this.selectedFolder = 'vggt';
      this.params.selectedFolder = this.selectedFolder;

      // Auto-enable flip upside down when switching to vggt folder
      this.params.flipUpsideDown = true;
      // Set sampling rate to 1 (100% of points) and point size to 0.003 for vggt folder
      this.params.subsampleRate = 1.0;
      this.params.pointSize = 0.003;

      // Apply the changes immediately
      if (this.callbacks.onPointSizeChange) {
        this.callbacks.onPointSizeChange(0.003);
      }
      if (this.callbacks.onSubsampleRateChange) {
        this.callbacks.onSubsampleRateChange(1.0);
      }

      console.log('Auto-enabled flip upside down and adjusted sampling rate to 1.0, point size to 0.003 for vggt folder after survey completion');

      this.glbFiles = getModelUrls(this.selectedFolder);
      this.currentGlbIndex = 0;
      this.params.currentGlb = this.glbFiles[0];
      // Do not load next model yet; wait until user starts XR again
      if (this.pointcloudManager && typeof this.pointcloudManager.clearPointCloud === 'function') {
        this.pointcloudManager.clearPointCloud();
      }

      // Show phase 1 finished message immediately
      this.sceneSetup.showPhase1FinishedOverlay();
    } else if (this.selectedFolder === 'vggt') {
      // Phase 2 completed - show thank you message
      console.log('Phase 2 completed - showing thank you message');
      // Clear any remaining model from the scene
      if (this.pointcloudManager && typeof this.pointcloudManager.clearPointCloud === 'function') {
        this.pointcloudManager.clearPointCloud();
      }
      setTimeout(() => {
        this.sceneSetup.showThankYouOverlay();
      }, 500); // Shorter delay since no folder switching needed
    }
  }


  animate() {
    this.sceneSetup.renderer.setAnimationLoop(this.render.bind(this));
  }

  render() {
    // Update time for animations (e.g., morphing)
    this.pointcloudManager.updateTime();

    // Render the scene
    this.sceneSetup.render();
  }
}


