import { blockModelSelections, config, getModelPositionPreset, getModelRenderPreset } from "../config.js";

// Central orchestrator for blocks, XR flow, and sequencing.
export class AppController {
  constructor({ sceneManager, modelLoader, overlayManager, params, guiUpdate, folderSequence, autoSwitchDelayMs = 1000 }) {
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
    if (this.pendingSurvey && this.state === 'block') {
      this.state = 'survey';
      const questions = this.getSurveyQuestions();
      const contextProvider = () => ({
        folder: this.selectedFolder,
        model: this.params.currentGlb,
        modelIndex: this.currentGlbIndex,
        sequenceIndex: this.currentFolderIndex,
        totalFolders: this.blocks.length,
        isLastFolder: this.currentBlockIndex >= this.blocks.length - 1,
        hasNextFolder: this.currentBlockIndex < this.blocks.length - 1
      });
      try { console.log('[Survey] Showing survey overlay with context:', contextProvider()); this.ui.showSurveyOverlay(questions, contextProvider); } catch (e) { console.warn('[Survey] Failed to show survey overlay', e); }
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
    this.models.loadGlbModel(glbUrl, this.params, () => {
      const position = this.modelPosition || { x: 0, y: 2.1, z: -3 };
      this.models.updatePointCloudPosition(position.x, position.y, position.z);
      this.models.setFlipUpsideDown(this.params.flipUpsideDown);
      this.models.setMirrorZ(this.params.mirrorZ);
      if (this.autoSwitchEnabled && this.scene && this.scene.isInXRSession) {
        this.startAutoSwitchTimer();
      }
    });
  }

  switchToNextGlb() {
    const atEnd = this.currentGlbIndex >= this.glbFiles.length - 1;
    console.log('[Flow] switchToNextGlb: atEnd=', atEnd, 'inXR=', !!(this.scene && this.scene.isInXRSession), 'folder=', this.selectedFolder, 'block=', this.currentBlockIndex, 'modelIndex=', this.currentGlbIndex);
    if (atEnd) {
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

  handleSurveySubmit() {
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
      this.models.clearPointCloud();
      console.log('[Flow] Prepared next block: folder=', this.selectedFolder, 'models=', this.glbFiles);
      // Resume XR immediately within the same user activation (submit click)
      try { if (this.scene && this.scene.renderer && !this.scene.renderer.xr.isPresenting) { console.log('[Flow] Starting XR session after survey submit'); this.scene.startXRSession(); } } catch (e) { console.warn('[Flow] Failed to start XR after survey submit', e); }
    } else {
      // Final: move to attrak
      this.state = 'attrak';
      this.models.clearPointCloud();
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
      this.models.clearPointCloud();
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

  getSurveyQuestions() {
    return [
      { key: 'qOverall', text: 'How do you rate the overall visual quality of these models?', left: 'very poor', right: 'excellent', summary: 'QUALITY' },
      { key: 'q4', text: 'How authentic did you find the pictures you looked at?', left: 'not authentic at all', right: 'very authentic', summary: 'AUTHENTICITY' },
      { key: 'q5', text: 'How detailed were you able to perceive the pictures?', left: 'not at all detailed', right: 'very detailed', summary: 'DETAILS' },
      { key: 'q6', text: 'How strongly did you feel immersed in the scene of the pictures?', left: 'not at all', right: 'very much', summary: 'IMMERSION' }
    ];
  }
}


