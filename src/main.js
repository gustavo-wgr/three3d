import * as THREE from "three";
import { SceneSetup } from "./scene-setup.js";
import { DataCollector } from "./DataCollector.js";
import { UIOverlayManager } from "./UIOverlayManager.js";
import { ExperimentController } from "./ExperimentController.js";
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
    
    // Ordered XR folder sequence
    this.folderSequence = [
      'train',
      'moge-long',
      'moge-medium',
      'moge-short',
      'uni-long',
      'uni-medium',
      'uni-short',
      'vggt-long',
      'vggt-medium',
      'vggt-short'
    ];
    this.currentFolderIndex = 0;
    
    // State variables
    this.selectedFolder = this.folderSequence[0];
    this.glbFiles = [];
    this.currentGlbIndex = 0;
    this.autoSwitchEnabled = true;
    // 10s per model
    this.autoSwitchDelayMs = 1000;
    this.autoSwitchTimer = null;
    
    // Parameters for GUI
    this.params = {
      pointSize: 0.006,
      subsampleRate: 0.06,
      modelScale: 1.0,
      flipUpsideDown: false,
      mirrorZ: false,
      // New: initial yaw rotation for facing camera without mirroring
      initialYawRadians: 0.0,
      xrBlackBackground: false,
      coloredBackground: false,
      backgroundColorPicker: '#0a0a0a',
      selectedFolder: this.selectedFolder,
      currentGlb: '',
      availableFolders: getAvailableFolders(),
      toggleBackground: () => this.sceneSetup.toggleBackground(),
      switchToNextGlb: () => this.controller && this.controller.switchToNextGlb(),
      switchFolder: () => this.controller && this.controller.switchFolder(),
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
      // Debug utility: log current rendering and position configuration
      logCurrentConfig: () => this.logCurrentConfig(),
    };

    // Bind handlers
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  async initialize() {
    // Initialize scene setup
    this.sceneSetup = new SceneSetup();
    this.sceneSetup.initialize();

    // Data collection and overlays
    this.dataCollector = new DataCollector();
    this.sceneSetup.setDataCollector(this.dataCollector);
    this.ui = new UIOverlayManager(this.sceneSetup);

    // Initialize pointcloud manager
    this.pointcloudManager = new PointcloudManager(this.sceneSetup.scene);


    // Initialize GUI
    const gui = new dat.GUI();
    this.callbacks = this.getGUICallbacks(); // Store callbacks for later use
    this.guiManager = new GUIManager(gui, this.params, this.callbacks);
    this.guiManager.setupGUI();

    // Controller: orchestrates XR flow and sequencing
    this.controller = new ExperimentController({
      sceneSetup: this.sceneSetup,
      pointcloudManager: this.pointcloudManager,
      params: this.params,
      guiUpdate: (fields) => {
        if (this.guiManager && typeof this.guiManager.updateDisplayFor === 'function') {
          this.guiManager.updateDisplayFor(fields);
        }
      },
      folderSequence: this.folderSequence,
      autoSwitchDelayMs: this.autoSwitchDelayMs
    });
    this.controller.initialize();

    // Provide metadata for each survey submission (use controller indices)
    this.sceneSetup.setSurveyMetadataProvider(() => ({
      folder: (this.controller && this.controller.selectedFolder) || this.selectedFolder,
      model: this.params.currentGlb,
      modelIndex: (this.controller && this.controller.currentGlbIndex) || this.currentGlbIndex,
      sequenceIndex: (this.controller && this.controller.currentFolderIndex) || this.currentFolderIndex
    }));

    // Keyboard listener for quick actions
    document.addEventListener('keydown', this.onKeyDown);

    // Controller handles initial model load

    // Update GUI param actions to delegate to controller
    this.params.switchToNextGlb = () => this.controller && this.controller.switchToNextGlb();
    this.params.switchFolder = () => this.controller && this.controller.switchFolder();

    // Start animation loop
    this.animate();
  }

  logCurrentConfig() {
    try {
      const pointSize = this.pointcloudManager && this.pointcloudManager.getMaterial ? (this.pointcloudManager.getMaterial()?.uniforms?.pointSize?.value) : this.params.pointSize;
      const subsampleRate = this.params.subsampleRate;
      const scale = this.params.modelScale;
      const pos = this.modelPosition;
      const currentGlb = this.params.currentGlb || '';
      const folder = this.selectedFolder || '';
      const msg = {
        folder,
        currentGlb,
        pointSize,
        subsampleRate,
        modelScale: scale,
        position: { x: pos.x, y: pos.y, z: pos.z }
      };
      console.log('[Config]', JSON.stringify(msg, null, 2));
    } catch (e) {
      console.log('[Config] pointSize:', this.params.pointSize,
        'subsampleRate:', this.params.subsampleRate,
        'modelScale:', this.params.modelScale,
        'position:', this.modelPosition);
    }
  }

  // XR events and auto-switch are managed by ExperimentController

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
        this.glbFiles = getModelUrls(this.selectedFolder).slice(0, 3);
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
      onMirrorZToggle: (value) => {
        if (this.pointcloudManager) {
          this.pointcloudManager.setMirrorZ(!!value);
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

  // Model loading is managed by ExperimentController

  updatePointCloudSampling(rate) {
    this.pointcloudManager.updatePointCloudSampling(rate, this.params, this.modelPosition);
  }

  // Sequencing is managed by ExperimentController

  // Folder switching is managed by ExperimentController

  // Survey completion is managed by ExperimentController


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


