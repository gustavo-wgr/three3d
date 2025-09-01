import { getModelUrls, getModelPositionPreset, getModelRenderPreset } from "./config.js";

export class ExperimentController {
  constructor({ sceneSetup, pointcloudManager, params, guiUpdate, folderSequence, autoSwitchDelayMs = 1000 }) {
    this.sceneSetup = sceneSetup;
    this.pointcloudManager = pointcloudManager;
    this.params = params;
    this.guiUpdate = typeof guiUpdate === 'function' ? guiUpdate : () => {};
    this.folderSequence = Array.isArray(folderSequence) && folderSequence.length ? folderSequence.slice() : [];
    this.currentFolderIndex = 0;
    this.selectedFolder = this.folderSequence[0] || '';
    this.glbFiles = [];
    this.currentGlbIndex = 0;
    this.autoSwitchEnabled = true;
    this.autoSwitchDelayMs = autoSwitchDelayMs;
    this.autoSwitchTimer = null;

    this.onXRSessionStart = this.onXRSessionStart.bind(this);
    this.onXRSessionEnd = this.onXRSessionEnd.bind(this);
    this.handleSurveyCompletion = this.handleSurveyCompletion.bind(this);
  }

  initialize() {
    // Attach XR session listeners
    if (this.sceneSetup && this.sceneSetup.renderer && this.sceneSetup.renderer.xr) {
      this.sceneSetup.renderer.xr.addEventListener("sessionstart", this.onXRSessionStart);
      this.sceneSetup.renderer.xr.addEventListener("sessionend", this.onXRSessionEnd);
    }

    // Survey submission resumes flow
    if (this.sceneSetup && typeof this.sceneSetup.setSurveyCompletedCallback === 'function') {
      this.sceneSetup.setSurveyCompletedCallback(this.handleSurveyCompletion);
    }

    // Initialize first folder/models
    this.selectedFolder = this.folderSequence[0] || this.selectedFolder;
    this.params.selectedFolder = this.selectedFolder;
    try {
      if (this.sceneSetup && typeof this.sceneSetup.setTrainingMode === 'function') {
        this.sceneSetup.setTrainingMode(this.selectedFolder === 'train');
      }
    } catch (_) {}
    this.glbFiles = getModelUrls(this.selectedFolder).slice(0, 3);
    this.currentGlbIndex = 0;
    this.params.currentGlb = this.glbFiles[0] || '';
    if (this.params.currentGlb) {
      this.loadCurrentModel();
    }
  }

  destroy() {
    try {
      if (this.sceneSetup && this.sceneSetup.renderer && this.sceneSetup.renderer.xr) {
        this.sceneSetup.renderer.xr.removeEventListener("sessionstart", this.onXRSessionStart);
        this.sceneSetup.renderer.xr.removeEventListener("sessionend", this.onXRSessionEnd);
      }
    } catch (_) {}
    if (this.autoSwitchTimer) {
      clearTimeout(this.autoSwitchTimer);
      this.autoSwitchTimer = null;
    }
  }

  setAutoSwitchEnabled(enabled) {
    this.autoSwitchEnabled = !!enabled;
    if (!this.autoSwitchEnabled && this.autoSwitchTimer) {
      clearTimeout(this.autoSwitchTimer);
      this.autoSwitchTimer = null;
    } else if (this.autoSwitchEnabled && this.sceneSetup && this.sceneSetup.isInXRSession) {
      this.startAutoSwitchTimer();
    }
  }

  startAutoSwitchTimer() {
    if (this.autoSwitchTimer) {
      clearTimeout(this.autoSwitchTimer);
    }
    this.autoSwitchTimer = setTimeout(() => this.switchToNextGlb(), this.autoSwitchDelayMs);
    console.log("Auto-switch timer started");
  }

  onXRSessionStart() {
    console.log("XR session started - controller");
    if (this.sceneSetup && typeof this.sceneSetup.hidePhase1FinishedOverlay === 'function') {
      this.sceneSetup.hidePhase1FinishedOverlay();
    }
    if (this.sceneSetup && typeof this.sceneSetup.hideAttrakDiffOverlay === 'function') {
      this.sceneSetup.hideAttrakDiffOverlay();
    }
    const hasPointCloud = this.pointcloudManager && this.pointcloudManager.getPointCloud && this.pointcloudManager.getPointCloud();
    if (!hasPointCloud && this.glbFiles.length > 0) {
      this.loadCurrentModel();
    }
    if (this.autoSwitchEnabled && this.glbFiles.length > 0) {
      this.startAutoSwitchTimer();
    }
  }

  onXRSessionEnd() {
    console.log("XR session ended - controller");
    if (this.autoSwitchTimer) {
      clearTimeout(this.autoSwitchTimer);
      this.autoSwitchTimer = null;
    }
    if (this.pointcloudManager && typeof this.pointcloudManager.clearPointCloud === 'function') {
      this.pointcloudManager.clearPointCloud();
    }
    // SceneSetup is responsible for showing the survey overlay on session end
  }

  loadCurrentModel() {
    const glbUrl = this.glbFiles[this.currentGlbIndex];
    if (!glbUrl) return;
    // Position preset
    try {
      const urlParts = glbUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      // Reset per-model flags to folder defaults to avoid sticky flags across models
      const isVggtFolder = this.selectedFolder && this.selectedFolder.startsWith('vggt');
      this.params.flipUpsideDown = !!isVggtFolder;
      this.params.mirrorZ = false;
      this.guiUpdate(['flipUpsideDown', 'mirrorZ']);
      const posPreset = getModelPositionPreset(this.selectedFolder, fileName);
      if (posPreset && isFinite(posPreset.x) && isFinite(posPreset.y) && isFinite(posPreset.z)) {
        this.baseModelPosition = { x: posPreset.x, y: posPreset.y, z: posPreset.z };
      } else {
        this.baseModelPosition = { x: 0, y: 2.1, z: -3 };
      }
      const offsetX = this.params.presetOffsetX || 0;
      const offsetY = this.params.presetOffsetY || 0;
      const offsetZ = this.params.presetOffsetZ || 0;
      this.modelPosition = {
        x: this.baseModelPosition.x + offsetX,
        y: this.baseModelPosition.y + offsetY,
        z: this.baseModelPosition.z + offsetZ
      };
      // Render preset
      const renderPreset = getModelRenderPreset(this.selectedFolder, fileName);
      if (renderPreset && typeof renderPreset === 'object') {
        if (isFinite(renderPreset.pointSize)) this.params.pointSize = renderPreset.pointSize;
        if (isFinite(renderPreset.subsampleRate)) this.params.subsampleRate = renderPreset.subsampleRate;
        if (isFinite(renderPreset.modelScale)) this.params.modelScale = renderPreset.modelScale;
        if (typeof renderPreset.flipUpsideDown === 'boolean') this.params.flipUpsideDown = !!renderPreset.flipUpsideDown;
        if (typeof renderPreset.mirrorZ === 'boolean') this.params.mirrorZ = !!renderPreset.mirrorZ;
        if (renderPreset.faceCamera === true) this.params.initialYawRadians = Math.PI;
        else if (isFinite(renderPreset.yawDegrees)) this.params.initialYawRadians = Number(renderPreset.yawDegrees) * Math.PI / 180.0;
        else this.params.initialYawRadians = 0.0;
        this.guiUpdate(['pointSize', 'subsampleRate', 'modelScale', 'flipUpsideDown', 'mirrorZ']);
      }
    } catch (e) {
      console.warn('Preset position/render check failed for', glbUrl, e);
    }

    this.params.currentGlb = glbUrl;
    this.pointcloudManager.loadGlbModel(glbUrl, this.params, () => {
      const position = this.modelPosition || { x: 0, y: 2.1, z: -3 };
      this.pointcloudManager.updatePointCloudPosition(position.x, position.y, position.z);
      this.pointcloudManager.setFlipUpsideDown(this.params.flipUpsideDown);
      this.pointcloudManager.setMirrorZ(this.params.mirrorZ);
      if (this.params.coloredBackground && this.sceneSetup) {
        try {
          const urlParts = (this.params.currentGlb || '').split('/');
          const fileName = urlParts[urlParts.length - 1];
          const preset = getModelRenderPreset(this.selectedFolder, fileName);
          const bg = preset && preset.backgroundColor;
          this.sceneSetup.setColoredBackgroundEnabled(true, bg);
        } catch (_) {}
      }
      if (this.autoSwitchTimer) {
        clearTimeout(this.autoSwitchTimer);
      }
      if (this.autoSwitchEnabled && this.sceneSetup && this.sceneSetup.isInXRSession) {
        this.startAutoSwitchTimer();
      }
    });
  }

  switchToNextGlb() {
    const atEnd = this.currentGlbIndex >= this.glbFiles.length - 1;
    if (atEnd) {
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
    this.loadCurrentModel();
  }

  handleSurveyCompletion() {
    console.log('Survey completed - controller');
    const isLastFolder = this.currentFolderIndex >= this.folderSequence.length - 1;
    if (!isLastFolder) {
      this.currentFolderIndex += 1;
      this.selectedFolder = this.folderSequence[this.currentFolderIndex];
      this.params.selectedFolder = this.selectedFolder;
      try {
        if (this.sceneSetup && typeof this.sceneSetup.setTrainingMode === 'function') {
          this.sceneSetup.setTrainingMode(this.selectedFolder === 'train');
        }
      } catch (_) {}

      // Folder-specific default tweaks (vggt*)
      if (this.selectedFolder.startsWith('vggt')) {
        this.params.flipUpsideDown = true;
        this.params.subsampleRate = 1.0;
        this.params.pointSize = 0.003;
        this.guiUpdate(['pointSize', 'subsampleRate']);
      } else {
        this.params.flipUpsideDown = false;
        this.params.subsampleRate = 0.06;
        this.params.pointSize = 0.006;
        this.guiUpdate(['pointSize', 'subsampleRate']);
      }

      this.glbFiles = getModelUrls(this.selectedFolder).slice(0, 3);
      this.currentGlbIndex = 0;
      this.params.currentGlb = this.glbFiles[0] || '';

      if (this.pointcloudManager && typeof this.pointcloudManager.clearPointCloud === 'function') {
        this.pointcloudManager.clearPointCloud();
      }

      if (this.sceneSetup && typeof this.sceneSetup.startXRSession === 'function') {
        Promise.resolve(this.sceneSetup.startXRSession()).then((ok) => {
          if (!ok && this.sceneSetup && typeof this.sceneSetup.showPhase1FinishedOverlay === 'function') {
            this.sceneSetup.showPhase1FinishedOverlay();
          }
        });
      }
    } else {
      console.log('All folders completed - controller');
      if (this.pointcloudManager && typeof this.pointcloudManager.clearPointCloud === 'function') {
        this.pointcloudManager.clearPointCloud();
      }
      setTimeout(() => {
        if (this.sceneSetup && typeof this.sceneSetup.showAttrakDiffOverlay === 'function') {
          this.sceneSetup.showAttrakDiffOverlay();
        }
      }, 500);
    }
  }

  switchFolder() {
    const idx = this.folderSequence.indexOf(this.selectedFolder);
    const nextIdx = (idx >= 0 ? (idx + 1) : this.currentFolderIndex + 1) % this.folderSequence.length;
    this.switchToFolder(this.folderSequence[nextIdx]);
  }

  switchToFolder(folder) {
    if (!folder) return;
    this.selectedFolder = folder;
    this.params.selectedFolder = folder;
    try {
      if (this.sceneSetup && typeof this.sceneSetup.setTrainingMode === 'function') {
        this.sceneSetup.setTrainingMode(this.selectedFolder === 'train');
      }
    } catch (_) {}
    if (folder.startsWith('vggt')) {
      this.params.flipUpsideDown = true;
      this.params.subsampleRate = 1.0;
      this.params.pointSize = 0.003;
      this.guiUpdate(['pointSize', 'subsampleRate']);
    } else {
      this.params.flipUpsideDown = false;
      this.params.subsampleRate = 0.06;
      this.params.pointSize = 0.006;
      this.guiUpdate(['pointSize', 'subsampleRate']);
    }
    this.glbFiles = getModelUrls(folder).slice(0, 3);
    this.currentGlbIndex = 0;
    this.params.currentGlb = this.glbFiles[0] || '';
    if (this.params.currentGlb) this.loadCurrentModel();
  }
}


