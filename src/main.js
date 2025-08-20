import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SceneSetup } from "./scene-setup.js";
import { XRControllers } from "./xr-controllers.js";
import { PointcloudManager } from "./pointcloud-manager.js";
import { GUIManager } from "./gui-manager.js";
import { getModelUrls, getAvailableFolders } from "./config.js";
import { PointcloudPlayer } from "./pointcloud-player.js";

export class MainApplication {
  constructor() {
    this.sceneSetup = null;
    this.xrControllers = null;
    this.pointcloudManager = null;
    this.guiManager = null;
    this.pointcloudPlayer = null;
    
    // State variables
    this.selectedFolder = 'unik3d';
    this.glbFiles = [];
    this.currentGlbIndex = 0;
    this.isVideoMode = false;
    
    // Parameters for GUI
    this.params = {
      pointSize: 0.006,
      subsampleRate: 0.2,
      evaporationAmount: 0.01,
      evaporationSpeed: 0.04,
      maxHeight: 1.0,
      evaporationEnabled: true,
      modelScale: 1.0,
      flipUpsideDown: false,
      xrBlackBackground: false,
      selectedFolder: this.selectedFolder,
      currentGlb: '',
      currentVideoFrame: 0,
      playbackSpeed: 16.0,
      morphEnabled: true,
      availableFolders: getAvailableFolders(),
      toggleBackground: () => this.sceneSetup.toggleBackground(),
      switchToNextGlb: () => this.switchToNextGlb(),
      switchFolder: () => this.switchFolder(),
      toggleVideoMode: () => this.toggleVideoMode(),
      playVideo: () => this.playVideo(),
      pauseVideo: () => this.pauseVideo(),
      stopVideo: () => this.stopVideo(),
      nextFrame: () => this.nextFrame(),
      previousFrame: () => this.previousFrame(),
      // Positioning
      positionStep: 0.1,
      moveUp: () => this.nudgeModel(0, this.params.positionStep, 0),
      moveDown: () => this.nudgeModel(0, -this.params.positionStep, 0),
      moveLeft: () => this.nudgeModel(-this.params.positionStep, 0, 0),
      moveRight: () => this.nudgeModel(this.params.positionStep, 0, 0),
      moveForward: () => this.nudgeModel(0, 0, -this.params.positionStep),
      moveBackward: () => this.nudgeModel(0, 0, this.params.positionStep),
      resetPosition: () => this.resetModelPosition(),
    };
  }

  async initialize() {
    // Initialize scene setup
    this.sceneSetup = new SceneSetup();
    this.sceneSetup.initialize();

    // Initialize XR controllers
    this.xrControllers = new XRControllers(this.sceneSetup.scene, this.sceneSetup.renderer);
    this.xrControllers.initialize();

    // Initialize pointcloud manager
    this.pointcloudManager = new PointcloudManager(this.sceneSetup.scene);

    // Initialize PointcloudPlayer
    const loader = new GLTFLoader();
    this.pointcloudPlayer = new PointcloudPlayer(
      this.sceneSetup.scene,
      loader,
      (pointCloud, frameIndex) => {
        console.log(`PointcloudPlayer: Frame ${frameIndex} loaded`);
        if (pointCloud && pointCloud.geometry) {
          const geometry = pointCloud.geometry;
          const scaledGeometry = this.pointcloudManager.scaleGeometryToFitDemoSphere(geometry, 'pointcloud_video');
          this.pointcloudManager.originalGeometry = scaledGeometry.clone();

          // Handle color attributes
          if (geometry.attributes.color) {
            console.log("Color attribute found");
            this.pointcloudManager.originalGeometry.setAttribute("color", geometry.attributes.color.clone());
          } else if (geometry.attributes.COLOR_0) {
            console.log("COLOR_0 attribute found, mapping to color");
            this.pointcloudManager.originalGeometry.setAttribute("color", geometry.attributes.COLOR_0.clone());
          } else {
            console.log("No color attribute found, creating default colors");
            const count = this.pointcloudManager.originalGeometry.attributes.position.count;
            const colors = new Float32Array(count * 3);
            for (let i = 0; i < count * 3; i++) {
              colors[i] = 1.0;
            }
            this.pointcloudManager.originalGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
          }

          // Create the subsampled point cloud
          this.pointcloudManager.updatePointCloudSampling(this.params.subsampleRate, this.params);
        }
      },
      (frameIndex, totalFrames) => {
        console.log(`PointcloudPlayer: Frame ${frameIndex + 1}/${totalFrames}`);
        document.getElementById("info").textContent = `Video Frame: ${frameIndex + 1}/${totalFrames}`;
        this.params.currentVideoFrame = frameIndex;
      }
    );

    // Setup callbacks
    this.setupCallbacks();

    // Initialize GUI
    const gui = new dat.GUI();
    this.guiManager = new GUIManager(gui, this.params, this.getGUICallbacks());
    this.guiManager.setupGUI();

    // Initialize with default folder
    this.glbFiles = getModelUrls(this.selectedFolder);
    this.params.currentGlb = this.glbFiles[0];

    // Load initial model
    this.loadGlbModel(this.glbFiles[this.currentGlbIndex]);

    // Start animation loop
    this.animate();
  }

  setupCallbacks() {
    // XR controller callbacks
    this.xrControllers.onModelPositionChange = (x, y, z) => {
      this.pointcloudManager.updatePointCloudPosition(x, y, z);
    };

    this.xrControllers.onMeshSwitch = () => {
      this.switchToNextGlb();
    };
  }

  nudgeModel(dx, dy, dz) {
    const curr = this.xrControllers.getModelPosition();
    const nx = curr.x + dx;
    const ny = curr.y + dy;
    const nz = curr.z + dz;
    this.xrControllers.setModelPosition(nx, ny, nz);
    this.pointcloudManager.updatePointCloudPosition(nx, ny, nz);
  }

  resetModelPosition() {
    const defaultPos = { x: 0, y: 2.1, z: -3 };
    this.xrControllers.setModelPosition(defaultPos.x, defaultPos.y, defaultPos.z);
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
      onEvaporationAmountChange: (value) => {
        if (this.pointcloudManager.originalGeometry) {
          this.updatePointCloudSampling(this.params.subsampleRate);
        }
      },
      onEvaporationSpeedChange: (value) => {
        if (this.pointcloudManager.getMaterial()) {
          this.pointcloudManager.getMaterial().uniforms.evaporationSpeed.value = value;
        }
      },
      onMaxHeightChange: (value) => {
        if (this.pointcloudManager.getMaterial()) {
          this.pointcloudManager.getMaterial().uniforms.maxHeight.value = value;
        }
      },
      onEvaporationEnabledChange: (value) => {
        if (this.pointcloudManager.getMaterial()) {
          this.pointcloudManager.getMaterial().uniforms.evaporationEnabled.value = value ? 1.0 : 0.0;
        }
      },
      onFolderChange: (value) => {
        this.selectedFolder = value;
        this.glbFiles = getModelUrls(this.selectedFolder);
        this.currentGlbIndex = 0;
        this.params.currentGlb = this.glbFiles[0];
        this.loadGlbModel(this.glbFiles[this.currentGlbIndex]);
      },
      onVideoFrameChange: (value) => {
        if (this.isVideoMode && this.pointcloudPlayer) {
          this.pointcloudPlayer.seekToFrame(value);
        }
      },
      onPlaybackSpeedChange: (value) => {
        if (this.pointcloudPlayer) {
          this.pointcloudPlayer.setFPS(value);
        }
      },
      onMorphToggle: (value) => {
        this.params.morphEnabled = !!value;
      },
      onXRBackgroundModeChange: (value) => {
        if (this.sceneSetup) {
          this.sceneSetup.setXRBlackBackgroundEnabled(!!value);
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
    };
  }

  loadGlbModel(glbUrl) {
    this.pointcloudManager.loadGlbModel(glbUrl, this.params, (pointCloud, frameIndex) => {
      // Callback when model is loaded
      const position = this.xrControllers.getModelPosition();
      this.pointcloudManager.updatePointCloudPosition(position.x, position.y, position.z);
    });
  }

  updatePointCloudSampling(rate) {
    const position = this.xrControllers.getModelPosition();
    this.pointcloudManager.updatePointCloudSampling(rate, this.params, position);
  }

  switchToNextGlb() {
    this.currentGlbIndex = (this.currentGlbIndex + 1) % this.glbFiles.length;
    this.params.currentGlb = this.glbFiles[this.currentGlbIndex];
    this.loadGlbModel(this.params.currentGlb);
  }

  switchFolder() {
    this.selectedFolder = this.selectedFolder === 'unik3d' ? 'vggt' : 'unik3d';
    this.params.selectedFolder = this.selectedFolder;
    this.glbFiles = getModelUrls(this.selectedFolder);
    this.currentGlbIndex = 0;
    this.params.currentGlb = this.glbFiles[0];
    this.loadGlbModel(this.glbFiles[this.currentGlbIndex]);
  }

  toggleVideoMode() {
    this.isVideoMode = !this.isVideoMode;
    if (this.isVideoMode) {
      // Reset canonical bbox so first frame defines it
      if (this.pointcloudManager) {
        this.pointcloudManager.resetVideoCanonical();
      }
      this.selectedFolder = 'pointcloud_video';
      this.params.selectedFolder = this.selectedFolder;
      this.glbFiles = getModelUrls(this.selectedFolder);
      
      if (this.pointcloudPlayer) {
        this.pointcloudPlayer.initialize(this.glbFiles, this.params.playbackSpeed);
      }
      
      console.log("Switched to video mode");
    } else {
      this.selectedFolder = 'unik3d';
      this.params.selectedFolder = this.selectedFolder;
      this.glbFiles = getModelUrls(this.selectedFolder);
      this.currentGlbIndex = 0;
      this.params.currentGlb = this.glbFiles[0];
      
      if (this.pointcloudPlayer) {
        this.pointcloudPlayer.pause();
      }
      // Clear canonical bbox when leaving video mode
      if (this.pointcloudManager) {
        this.pointcloudManager.resetVideoCanonical();
      }
      
      this.loadGlbModel(this.glbFiles[this.currentGlbIndex]);
      console.log("Switched to normal mode");
    }
  }

  playVideo() {
    if (this.isVideoMode && this.pointcloudPlayer) {
      this.pointcloudPlayer.play();
    }
  }

  pauseVideo() {
    if (this.pointcloudPlayer) {
      this.pointcloudPlayer.pause();
    }
  }

  stopVideo() {
    if (this.pointcloudPlayer) {
      this.pointcloudPlayer.stop();
    }
  }

  nextFrame() {
    if (this.isVideoMode && this.pointcloudPlayer) {
      this.pointcloudPlayer.nextFrame();
    }
  }

  previousFrame() {
    if (this.isVideoMode && this.pointcloudPlayer) {
      this.pointcloudPlayer.previousFrame();
    }
  }

  animate() {
    this.sceneSetup.renderer.setAnimationLoop(this.render.bind(this));
  }

  render() {
    // Update time uniform for evaporation effect
    this.pointcloudManager.updateTime();

    // Render the scene
    this.sceneSetup.render();
  }
}
