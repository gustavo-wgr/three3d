import { blockModelSelections, config, getModelPositionPreset, getModelRenderPreset } from "../config.js";

// Central orchestrator for blocks, XR flow, and sequencing.
export class AppController {
  constructor({ sceneManager, modelLoader, overlayManager, params, guiUpdate, folderSequence, autoSwitchDelayMs = 1000, onPositionComputed }) {
    this.scene = sceneManager;
    this.models = modelLoader;
    this.ui = overlayManager;
    this.params = params || {};
    this.guiUpdate = typeof guiUpdate === 'function' ? guiUpdate : () => {};
    // Build explicit block plan from blockModelSelections
    this.blocks = Object.keys(blockModelSelections).map((folder) => ({
      folder,
      models: (blockModelSelections[folder] || []).map((m) => config.isDevelopment ? `${folder}/${m}` : `${config.huggingFace.baseUrl}/${folder}/${m}`)
    }));
    this.currentBlockIndex = 0;
    this.currentFolderIndex = 0; // legacy compat for metadata
    this.selectedFolder = this.blocks[0]?.folder || '';
    this.glbFiles = this.blocks[0]?.models || [];
    this.currentGlbIndex = 0;
    this.autoSwitchEnabled = true;
    this.autoSwitchDelayMs = autoSwitchDelayMs;
    this.autoSwitchTimer = null;
    this.pendingSurvey = false;
    this.state = 'idle'; // idle | block | survey | attrak | done
    this.onPositionComputed = typeof onPositionComputed === 'function' ? onPositionComputed : null;

    // FPS tracking per block
    this.__fpsTrackingEnabled = false;
    this.__fpsFrameCount = 0;
    this.__fpsDtSumMs = 0;

    // Per-eye resolution aggregation per block (XR frames only)
    this.__resLeftPixelSum = 0;   // sum of width*height per frame for left eye
    this.__resRightPixelSum = 0;  // sum of width*height per frame for right eye
    this.__resSampleCount = 0;    // number of XR frames sampled

    // Bind
    this.onXRStart = this.onXRStart.bind(this);
    this.onXREnd = this.onXREnd.bind(this);
    this.handleSurveySubmit = this.handleSurveySubmit.bind(this);
    this.handleAttrakSubmit = this.handleAttrakSubmit.bind(this);
  }

  initialize() {
    // Scene XR events
    this.scene.on('xrstart', this.onXRStart);
    this.scene.on('xrend', this.onXREnd);

    // Overlay events
    this.ui.on('surveySubmit', this.handleSurveySubmit);
    if (typeof this.ui.on === 'function') {
      this.ui.on('attrakSubmit', this.handleAttrakSubmit);
    }

    // Initial block
    this.selectedFolder = this.blocks[0]?.folder || this.selectedFolder;
    this.params.selectedFolder = this.selectedFolder;
    this.glbFiles = this.blocks[0]?.models || [];
    this.currentGlbIndex = 0;
    this.params.currentGlb = this.glbFiles[0] || '';
  }

  // Manual folder selection from GUI
  selectFolder(folder) {
    try {
      if (!folder || typeof folder !== 'string') return;
      // Find the target block by folder name
      const blockIndex = this.blocks.findIndex(b => b.folder === folder);
      if (blockIndex === -1) return;

      // Update indices and selection
      this.currentBlockIndex = blockIndex;
      this.currentFolderIndex = blockIndex;
      this.selectedFolder = this.blocks[blockIndex].folder;
      this.params.selectedFolder = this.selectedFolder;

      // Update models for this block
      this.glbFiles = this.blocks[blockIndex].models || [];
      this.currentGlbIndex = 0;
      this.params.currentGlb = this.glbFiles[0] || '';

      // Clear current model and load first of the selected folder
      try { this.models.clearPointCloud && this.models.clearPointCloud(); } catch (_) {}

      // Adjust default rendering based on folder family similar to flow transitions
      if (this.selectedFolder.startsWith('vggt')) {
        this.params.flipUpsideDown = true;
        this.params.subsampleRate = 1.0;
        this.params.pointSize = 0.003;
      } else {
        this.params.flipUpsideDown = false;
        this.params.subsampleRate = 0.06;
        this.params.pointSize = 0.006;
      }
      this.guiUpdate && this.guiUpdate(['pointSize', 'subsampleRate', 'flipUpsideDown']);

      if (this.params.currentGlb) {
        this.loadCurrentModel();
      }
    } catch (e) {
      try { console.warn('[GUI] Failed to select folder', folder, e); } catch (_) {}
    }
  }

  destroy() {
    try { this.scene.off('xrstart', this.onXRStart); } catch (_) {}
    try { this.scene.off('xrend', this.onXREnd); } catch (_) {}
    try { this.ui.off && this.ui.off('surveySubmit', this.handleSurveySubmit); } catch (_) {}
    if (this.autoSwitchTimer) clearTimeout(this.autoSwitchTimer);
    this.autoSwitchTimer = null;
  }

  onXRStart() {
    // Show BLOCK X for 1s, then load first model
    this.state = 'block';
    const blockNumber = this.currentFolderIndex + 1;
    try { console.log('[BlockHUD] Requesting VR HUD for block', blockNumber); } catch (_) {}
    try {
      const ok = this.scene.showBlockMessage && this.scene.showBlockMessage(blockNumber, 1000);
      console.log('[BlockHUD] showBlockMessage result:', ok);
    } catch (e) { console.warn('[BlockHUD] showBlockMessage failed', e); }
    // After HUD delay, load first model (loadCurrentModel will start the timer)
    setTimeout(() => {
      try { console.log('[BlockHUD] HUD delay elapsed, proceeding to load first model'); } catch (_) {}
      if (this.glbFiles.length > 0 && this.params.currentGlb) {
        this.loadCurrentModel();
      }
    }, 1010);
  }

  onXREnd() {
    if (this.autoSwitchTimer) {
      clearTimeout(this.autoSwitchTimer);
      this.autoSwitchTimer = null;
    }
    // If a non-train block just ended, show survey now
    console.log('[Flow] onXREnd: state=', this.state, 'pendingSurvey=', this.pendingSurvey, 'folder=', this.selectedFolder, 'blockIndex=', this.currentBlockIndex);
    // Aggressively free model resources before showing survey to reduce lag
    try { this.models && typeof this.models.disposeAll === 'function' ? this.models.disposeAll() : (this.models && this.models.clearPointCloud && this.models.clearPointCloud()); } catch (e) { try { console.warn('[Flow] dispose before survey failed', e); } catch (_) {} }
    if (this.pendingSurvey && this.state === 'block') {
      this.state = 'survey';
      const contextProvider = () => ({
        folder: this.selectedFolder,
        model: this.params.currentGlb,
        modelIndex: this.currentGlbIndex,
        sequenceIndex: this.currentFolderIndex,
        totalFolders: this.blocks.length,
        isLastFolder: this.currentBlockIndex >= this.blocks.length - 1,
        hasNextFolder: this.currentBlockIndex < this.blocks.length - 1
      });
      try { console.log('[Survey] Showing survey overlay with context:', contextProvider()); this.ui.showSurveyOverlay(contextProvider); } catch (e) { console.warn('[Survey] Failed to show survey overlay', e); }
      this.pendingSurvey = false;
    }
  }

  startAutoSwitchTimer() {
    if (this.autoSwitchTimer) clearTimeout(this.autoSwitchTimer);
    console.log('Auto-switch timer started');
    this.autoSwitchTimer = setTimeout(() => this.switchToNextGlb(), this.autoSwitchDelayMs);
  }

  setAutoSwitchEnabled(enabled) {
    this.autoSwitchEnabled = !!enabled;
    if (!this.autoSwitchEnabled && this.autoSwitchTimer) {
      clearTimeout(this.autoSwitchTimer);
      this.autoSwitchTimer = null;
    }
    if (this.autoSwitchEnabled && this.scene && this.scene.isInXRSession) {
      this.startAutoSwitchTimer();
    }
    if (this.params) {
      this.params.autoSwitch = this.autoSwitchEnabled;
      this.guiUpdate && this.guiUpdate(['autoSwitch']);
    }
  }

  loadCurrentModel() {
    const glbUrl = this.glbFiles[this.currentGlbIndex];
    if (!glbUrl) return;

    try {
      const urlParts = glbUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
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
      console.warn('Preset computation failed for', glbUrl, e);
    }

    this.params.currentGlb = glbUrl;
    // Inform host app about computed positions (base and effective)
    try { this.onPositionComputed && this.onPositionComputed({ ...this.baseModelPosition }, { ...this.modelPosition }); } catch (_) {}
    // Provide initial position to loader so object spawns at the preset spot
    this.params.__initialPosition = { ...this.modelPosition };
    this.models.loadGlbModel(glbUrl, this.params, () => {
      try { delete this.params.__initialPosition; } catch (_) {}
      const position = this.modelPosition || { x: 0, y: 2.1, z: -3 };
      this.models.updatePointCloudPosition(position.x, position.y, position.z);
      this.models.setFlipUpsideDown(this.params.flipUpsideDown);
      this.models.setMirrorZ(this.params.mirrorZ);
      // Start FPS tracking at the first model of the block (exclude HUD delay)
      if (this.currentGlbIndex === 0) {
        this.__fpsFrameCount = 0;
        this.__fpsDtSumMs = 0;
        this.__fpsTrackingEnabled = true;
        // reset per-eye resolution accumulators at block start
        this.__resLeftPixelSum = 0;
        this.__resRightPixelSum = 0;
        this.__resSampleCount = 0;
      }
      if (this.autoSwitchEnabled && this.scene && this.scene.isInXRSession) {
        this.startAutoSwitchTimer();
      }
    });
  }

  // Reloads the currently selected model, re-applying presets (used when headset profile changes)
  reloadCurrentModel() {
    try {
      if (!this.glbFiles || this.glbFiles.length === 0) return;
      this.params.currentGlb = this.glbFiles[this.currentGlbIndex] || '';
      if (this.params.currentGlb) {
        this.loadCurrentModel();
      }
    } catch (_) {}
  }

  switchToNextGlb() {
    const atEnd = this.currentGlbIndex >= this.glbFiles.length - 1;
    console.log('[Flow] switchToNextGlb: atEnd=', atEnd, 'inXR=', !!(this.scene && this.scene.isInXRSession), 'folder=', this.selectedFolder, 'block=', this.currentBlockIndex, 'modelIndex=', this.currentGlbIndex);
    if (atEnd) {
      // Finalize and log FPS for the completed block
      this.__finalizeAndLogBlockFps();
      if (this.scene && this.scene.isInXRSession) {
        if (this.selectedFolder === 'train') {
          console.log('[Flow] End of train block inside XR; advancing to next block in same session');
          this.advanceToNextFolderInSameSession();
          return;
        }
        // Mark that we should show survey when XR ends
        this.pendingSurvey = true;
        console.log('[Flow] End of block inside XR; ending XR to show survey, pendingSurvey=true');
        this.scene.endXRSession();
        return;
      } else {
        console.log('[Flow] End of block outside XR; resetting model index');
        this.currentGlbIndex = 0;
      }
    } else {
      this.currentGlbIndex += 1;
      console.log('[Flow] Advancing to next model index=', this.currentGlbIndex);
    }
    this.params.currentGlb = this.glbFiles[this.currentGlbIndex];
    this.loadCurrentModel();
  }

  handleSurveySubmit(payload) {
    try { console.log('[Survey] Answers:', payload); } catch (_) {}
    const isLastFolder = this.currentBlockIndex >= this.blocks.length - 1;
    console.log('[Flow] handleSurveySubmit: isLastFolder=', isLastFolder, 'blockIndex=', this.currentBlockIndex, 'folder=', this.selectedFolder);
    if (!isLastFolder) {
      this.state = 'block';
      this.currentBlockIndex += 1;
      this.currentFolderIndex = this.currentBlockIndex; // keep metadata aligned
      const nextBlock = this.blocks[this.currentBlockIndex];
      this.selectedFolder = nextBlock.folder;
      this.params.selectedFolder = this.selectedFolder;

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

      this.glbFiles = nextBlock.models || [];
      this.currentGlbIndex = 0;
      this.params.currentGlb = this.glbFiles[0] || '';
      // Ensure prior block model resources are fully released before resuming
      try { this.models && typeof this.models.disposeAll === 'function' ? this.models.disposeAll() : (this.models && this.models.clearPointCloud && this.models.clearPointCloud()); } catch (_) {}
      console.log('[Flow] Prepared next block: folder=', this.selectedFolder, 'models=', this.glbFiles);
      // Resume XR immediately within the same user activation (submit click)
      try {
        if (this.scene && this.scene.renderer && !this.scene.renderer.xr.isPresenting) {
          // Show loading indicator in the web page during the brief handoff delay
          try { if (typeof this.scene.showLoadingVR === 'function') this.scene.showLoadingVR(); } catch (_) {}
          console.log('[Flow] Starting XR session after survey submit');
          // Re-apply background mode based on current GUI params to ensure passthrough unless toggled
          try { if (typeof this.scene.setXRBlackBackgroundEnabled === 'function') { console.log('[XRBG] (controller) applying xrBlack=', !!this.params.xrBlackBackground); this.scene.setXRBlackBackgroundEnabled(!!this.params.xrBlackBackground); } } catch (_) {}
          try { if (typeof this.scene.setColoredBackgroundEnabled === 'function') { console.log('[XRBG] (controller) applying colored=', !!this.params.coloredBackground, 'color=', this.params.backgroundColorPicker); this.scene.setColoredBackgroundEnabled(!!this.params.coloredBackground, this.params.backgroundColorPicker); } } catch (_) {}
          this.scene.startXRSession();
        }
      } catch (e) { console.warn('[Flow] Failed to start XR after survey submit', e); }
    } else {
      // Final: move to attrak
      this.state = 'attrak';
      try { this.models && typeof this.models.disposeAll === 'function' ? this.models.disposeAll() : (this.models && this.models.clearPointCloud && this.models.clearPointCloud()); } catch (_) {}
      if (this.scene && this.scene.isInXRSession) {
        console.log('[Flow] Last block: ending XR then showing AttrakDiff');
        this.scene.endXRSession();
        setTimeout(() => { console.log('[Attrak] Showing AttrakDiff after XR end'); try { this.ui.showAttrakDiff(); } catch (e) { console.warn('[Attrak] Failed to show AttrakDiff', e); } }, 800);
      } else {
        // If XR already ended and the survey was shown/closed, show AttrakDiff immediately
        console.log('[Attrak] XR not presenting; showing AttrakDiff immediately');
        try { this.ui.showAttrakDiff(); } catch (e) { console.warn('[Attrak] Failed to show AttrakDiff', e); }
      }
    }
  }

  advanceToNextFolderInSameSession() {
    this.state = 'block';
    const isLastFolder = this.currentBlockIndex >= this.blocks.length - 1;
    if (isLastFolder) {
      try { this.models && typeof this.models.disposeAll === 'function' ? this.models.disposeAll() : (this.models && this.models.clearPointCloud && this.models.clearPointCloud()); } catch (_) {}
      this.state = 'attrak';
      setTimeout(() => { console.log('[Attrak] Showing AttrakDiff at end of last block (same session)'); this.ui.showAttrakDiff(); }, 600);
      return;
    }

    this.currentBlockIndex += 1;
    this.currentFolderIndex = this.currentBlockIndex;
    const nextBlock2 = this.blocks[this.currentBlockIndex];
    this.selectedFolder = nextBlock2.folder;
    this.params.selectedFolder = this.selectedFolder;

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

    this.glbFiles = nextBlock2.models || [];
    this.currentGlbIndex = 0;
    this.params.currentGlb = this.glbFiles[0] || '';
    this.models.clearPointCloud();

    // Show BLOCK in VR (same-session transition) and load after delay
    try {
      const bn = this.currentFolderIndex + 1;
      console.log('[BlockHUD] (same-session) Requesting VR HUD for block', bn);
      const ok = this.scene.showBlockMessage && this.scene.showBlockMessage(bn, 1000);
      console.log('[BlockHUD] (same-session) showBlockMessage result:', ok);
    } catch (e) { console.warn('[BlockHUD] (same-session) showBlockMessage failed', e); }
    setTimeout(() => {
      console.log('[Flow] Loading first model of next block after HUD');
      if (this.params.currentGlb) { this.loadCurrentModel(); }
    }, 1010);
  }

  handleAttrakSubmit(payload) {
    // Final thank-you page after AttrakDiff
    try { this.state = 'done'; } catch (_) {}
    try { this.ui.showThankYou && this.ui.showThankYou(); } catch (_) {}
  }

  // ===== FPS tracking API =====
  onFrameTiming(dtMs, isXRFrame = false, perEye = null) {
    try {
      if (!this.__fpsTrackingEnabled || this.state !== 'block') return;
      // Only count XR-presented frames for headset FPS
      if (!isXRFrame) return;
      if (!(dtMs >= 0)) return;
      this.__fpsFrameCount += 1;
      this.__fpsDtSumMs += dtMs;
      // Aggregate per-eye resolution if provided
      if (perEye && typeof perEye === 'object') {
        const lw = Number(perEye.leftWidth);
        const lh = Number(perEye.leftHeight);
        const rw = Number(perEye.rightWidth);
        const rh = Number(perEye.rightHeight);
        const leftPixels = (isFinite(lw) && isFinite(lh) && lw > 0 && lh > 0) ? (lw * lh) : 0;
        const rightPixels = (isFinite(rw) && isFinite(rh) && rw > 0 && rh > 0) ? (rw * rh) : 0;
        if (leftPixels > 0 || rightPixels > 0) {
          this.__resLeftPixelSum += leftPixels;
          this.__resRightPixelSum += rightPixels;
          this.__resSampleCount += 1;
        }
      }
    } catch (_) {}
  }

  __finalizeAndLogBlockFps() {
    try {
      if (!this.__fpsTrackingEnabled) return;
      const totalSeconds = this.__fpsDtSumMs / 1000.0;
      const frames = this.__fpsFrameCount;
      const avgFps = totalSeconds > 0 ? (frames / totalSeconds) : 0;
      const blockNumber = this.currentFolderIndex + 1;
      // Compute average pixels per eye (per XR frame) if we have samples
      let avgLeftPixels = 0;
      let avgRightPixels = 0;
      if (this.__resSampleCount > 0) {
        avgLeftPixels = this.__resLeftPixelSum / this.__resSampleCount;
        avgRightPixels = this.__resRightPixelSum / this.__resSampleCount;
      }
      // Prefer symmetric resolutions if both eyes available; still report both
      const summary = {
        block: blockNumber,
        avgFps: Number(avgFps.toFixed(2)),
        avgPixelsPerEye: {
          left: Math.round(avgLeftPixels),
          right: Math.round(avgRightPixels)
        }
      };
      console.log('[Perf]', JSON.stringify(summary));
    } catch (_) {}
    // Reset tracking state
    this.__fpsTrackingEnabled = false;
    this.__fpsFrameCount = 0;
    this.__fpsDtSumMs = 0;
    this.__resLeftPixelSum = 0;
    this.__resRightPixelSum = 0;
    this.__resSampleCount = 0;
  }
}


