import * as THREE from "three";
import { SceneManager } from "./core/SceneManager.js";
import { DataCollector } from "./DataCollector.js";
import { OverlayManager } from "./ui/OverlayManager.js";
import { AppController } from "./core/AppController.js";
import { ModelLoader } from "./models/ModelLoader.js";
import { GUIManager } from "./gui-manager.js";
import { getModelUrls, getAvailableFolders, getModelPositionPreset, getModelRenderPreset, deviceProfiles, setActiveDeviceProfile, getActiveDeviceProfile } from "./config.js";

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
    // 10s per model
    this.autoSwitchDelayMs = 3000;
    
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
      availableHeadsets: deviceProfiles,
      // Headset profile selection
      headsetProfile: getActiveDeviceProfile(), // 'quest3' default
      toggleBackground: () => this.sceneSetup.toggleBackground(),
      switchToNextGlb: () => this.controller && this.controller.switchToNextGlb(),
      switchFolder: () => this.controller && this.controller.switchFolder(),
      autoSwitch: true,
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
    // XR frame timing state
    this.__lastXRTimeMs = null;
  }

  async initialize() {
    // Initialize scene manager
    this.sceneSetup = new SceneManager();
    this.sceneSetup.initialize();

    // Data collection and overlays
    this.dataCollector = new DataCollector();
    this.ui = new OverlayManager();
    // Pipe overlay events into data collector
    if (this.ui && typeof this.ui.on === 'function') {
      this.ui.on('surveySubmit', (payload) => {
        try { this.dataCollector.addSurvey(payload); } catch (_) {}
      });
      this.ui.on('attrakSubmit', (payload) => {
        try { this.dataCollector.addAttrakDiff(payload); this.dataCollector.download(); } catch (_) {}
      });
    }

    // Initialize pointcloud manager
    this.pointcloudManager = new ModelLoader(this.sceneSetup.scene);


    // Initialize GUI
    const gui = new dat.GUI();
    this.callbacks = this.getGUICallbacks(); // Store callbacks for later use
    this.guiManager = new GUIManager(gui, this.params, this.callbacks);
    this.guiManager.setupGUI();

    // Controller: orchestrates XR flow and sequencing
    this.controller = new AppController({
      sceneManager: this.sceneSetup,
      modelLoader: this.pointcloudManager,
      overlayManager: this.ui,
      params: this.params,
      guiUpdate: (fields) => {
        if (this.guiManager && typeof this.guiManager.updateDisplayFor === 'function') {
          this.guiManager.updateDisplayFor(fields);
        }
      },
      folderSequence: this.folderSequence,
      autoSwitchDelayMs: this.autoSwitchDelayMs,
      onPositionComputed: (basePos, effectivePos) => {
        // Keep app-level state in sync with controller's computed positions
        this.baseModelPosition = { ...basePos };
        this.modelPosition = { ...effectivePos };
      }
    });
    this.controller.initialize();

    // Provide metadata for each survey submission (use controller indices)
    this.sceneSetup.setSurveyMetadataProvider && this.sceneSetup.setSurveyMetadataProvider(() => ({
      folder: (this.controller && this.controller.selectedFolder) || this.selectedFolder,
      model: this.params.currentGlb,
      modelIndex: (this.controller && this.controller.currentGlbIndex) || this.currentGlbIndex,
      sequenceIndex: (this.controller && this.controller.currentFolderIndex) || this.currentFolderIndex,
      totalFolders: (this.controller && Array.isArray(this.controller.folderSequence)) ? this.controller.folderSequence.length : (Array.isArray(this.folderSequence) ? this.folderSequence.length : 0),
      isLastFolder: (this.controller && Array.isArray(this.controller.folderSequence))
        ? (this.controller.currentFolderIndex >= this.controller.folderSequence.length - 1)
        : (this.currentFolderIndex >= this.folderSequence.length - 1),
      hasNextFolder: (this.controller && Array.isArray(this.controller.folderSequence))
        ? (this.controller.currentFolderIndex < this.controller.folderSequence.length - 1)
        : (this.currentFolderIndex < this.folderSequence.length - 1)
    }));

    // Keyboard listener for quick actions
    document.addEventListener('keydown', this.onKeyDown);

    // Controller handles initial model load

    // Update GUI param actions to delegate to controller
    this.params.switchToNextGlb = () => this.controller && this.controller.switchToNextGlb();
    this.params.switchFolder = () => this.controller && this.controller.switchFolder && this.controller.switchFolder();

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
      // Prefer reading the actual object position if available
      let pos = this.modelPosition;
      try {
        const obj = this.pointcloudManager && this.pointcloudManager.getPointCloud && this.pointcloudManager.getPointCloud();
        if (obj && obj.position) {
          pos = { x: obj.position.x, y: obj.position.y, z: obj.position.z };
          // keep internal state in sync too
          this.modelPosition = { ...pos };
        }
      } catch (_) {}
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
        // Delegate manual folder switching to the controller for consistent behavior
        if (this.controller && typeof this.controller.selectFolder === 'function') {
          this.controller.selectFolder(value);
        } else {
          // Fallback: maintain previous behavior without direct model loading here
          this.selectedFolder = value;
          this.glbFiles = getModelUrls(this.selectedFolder).slice(0, 3);
          this.currentGlbIndex = 0;
          this.params.currentGlb = this.glbFiles[0] || '';
          // Delegate actual loading to ModelLoader if available
          if (this.pointcloudManager && typeof this.pointcloudManager.loadGlbModel === 'function' && this.params.currentGlb) {
            this.pointcloudManager.loadGlbModel(this.params.currentGlb, this.params, () => {
              const pos = this.modelPosition || { x: 0, y: 2.1, z: -3 };
              this.pointcloudManager.updatePointCloudPosition(pos.x, pos.y, pos.z);
            });
          }
        }
      },
      onAutoSwitchToggle: (value) => {
        if (this.controller && typeof this.controller.setAutoSwitchEnabled === 'function') {
          this.controller.setAutoSwitchEnabled(!!value);
        } else {
          this.params.autoSwitch = !!value;
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
      ,
      onHeadsetChange: (value) => {
        try {
          setActiveDeviceProfile(String(value));
          // Reload current model with new presets
          if (this.controller && typeof this.controller.reloadCurrentModel === 'function') {
            this.controller.reloadCurrentModel();
          } else if (this.pointcloudManager && this.params.currentGlb) {
            const pos = this.modelPosition || { x: 0, y: 2.1, z: -3 };
            this.pointcloudManager.loadGlbModel(this.params.currentGlb, this.params, () => {
              this.pointcloudManager.updatePointCloudPosition(pos.x, pos.y, pos.z);
            });
          }
        } catch (_) {}
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
    this.sceneSetup.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
  }

  render(time, frame) {
    // Update time for animations (e.g., morphing)
    this.pointcloudManager.updateTime();

    // Render the scene
    this.sceneSetup.render();

    // Report XR frame timing (headset) to controller for FPS tracking
    try {
      if (frame) {
        const t = Number(time);
        if (!isNaN(t)) {
          if (this.__lastXRTimeMs == null) {
            this.__lastXRTimeMs = t;
          } else {
            const dtMs = t - this.__lastXRTimeMs;
            this.__lastXRTimeMs = t;
            // Compute per-eye viewport sizes (pixels per eye) if available
            let perEye = null;
            try {
              // Prefer Three.js XR cameras' viewports (works across baseLayer and Layers API)
              const xrMgr = this.sceneSetup && this.sceneSetup.renderer ? this.sceneSetup.renderer.xr : null;
              const xrCamera = xrMgr && typeof xrMgr.getCamera === 'function' ? xrMgr.getCamera() : null;
              const cams = xrCamera && Array.isArray(xrCamera.cameras) ? xrCamera.cameras : null;
              if (cams && cams.length > 0) {
                const leftCam = cams[0];
                const rightCam = cams[1];
                const lvp = leftCam && leftCam.viewport ? leftCam.viewport : null; // THREE.Vector4 x,y,z,w
                const rvp = rightCam && rightCam.viewport ? rightCam.viewport : null;
                perEye = {
                  leftWidth: lvp ? lvp.z : undefined,
                  leftHeight: lvp ? lvp.w : undefined,
                  rightWidth: rvp ? rvp.z : undefined,
                  rightHeight: rvp ? rvp.w : undefined
                };
              } else {
                // Fallback to WebXR baseLayer viewport
                const refSpace = xrMgr && typeof xrMgr.getReferenceSpace === 'function' ? xrMgr.getReferenceSpace() : null;
                const session = frame.session || (xrMgr && typeof xrMgr.getSession === 'function' ? xrMgr.getSession() : null);
                const baseLayer = session && session.renderState ? session.renderState.baseLayer : null;
                const pose = refSpace ? frame.getViewerPose(refSpace) : null;
                if (pose && baseLayer && Array.isArray(pose.views) && pose.views.length > 0 && typeof baseLayer.getViewport === 'function') {
                  const leftView = pose.views.find(v => v.eye === 'left') || pose.views[0];
                  const rightView = pose.views.find(v => v.eye === 'right') || pose.views[1];
                  const lvp2 = leftView ? baseLayer.getViewport(leftView) : null;
                  const rvp2 = rightView ? baseLayer.getViewport(rightView) : null;
                  perEye = {
                    leftWidth: lvp2 ? lvp2.width : undefined,
                    leftHeight: lvp2 ? lvp2.height : undefined,
                    rightWidth: rvp2 ? rvp2.width : undefined,
                    rightHeight: rvp2 ? rvp2.height : undefined
                  };
                }
              }
            } catch (_) {}
            if (this.controller && typeof this.controller.onFrameTiming === 'function') {
              this.controller.onFrameTiming(dtMs, true, perEye);
            }
          }
        }
      }
    } catch (_) {}
  }
}


