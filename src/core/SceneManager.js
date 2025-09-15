import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { XRButton } from "three/addons/webxr/XRButton.js";

// Minimal scene/XR manager. Emits 'xrstart' and 'xrend' events.
export class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.backgroundSphere = null;
    this.isBackgroundVisible = false;
    this.isInXRSession = false;
    this.xrBlackBackgroundEnabled = false;
    this.coloredBackgroundEnabled = false;
    this.coloredBackgroundColor = new THREE.Color(0x000000);
    this.listeners = { xrstart: [], xrend: [] };
    // In-VR Block HUD sprite
    this.blockSprite = null;
    this.blockTimer = null;
    this.startExplanationEl = null;
  }

  on(evt, fn) { if (this.listeners[evt]) this.listeners[evt].push(fn); }
  off(evt, fn) { if (this.listeners[evt]) this.listeners[evt] = this.listeners[evt].filter(f => f !== fn); }
  emit(evt, payload) { (this.listeners[evt] || []).forEach(fn => { try { fn(payload); } catch (_) {} }); }

  initialize() {
    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 3);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    this.createBackgroundSphere();

    this.sessionInit = { requiredFeatures: ["hand-tracking"], optionalFeatures: ["local-floor", "bounded-floor", "local", "viewer", "layers"] };
    if (this.renderer && this.renderer.xr && typeof this.renderer.xr.setReferenceSpaceType === 'function') {
      this.renderer.xr.setReferenceSpaceType('local-floor');
    }
    document.body.appendChild(XRButton.createButton(this.renderer, this.sessionInit));
    this.injectXRButtonStyles();
    this.customizeXRButton();
    this.injectStartExplanationStyles();
    this.createOrShowStartExplanation();

    this.setupXREvents();
    this.setupLighting();
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }

  async startXRSession() {
    try {
      if (navigator.xr && navigator.xr.requestSession) {
        if (this.renderer && this.renderer.xr && typeof this.renderer.xr.setReferenceSpaceType === 'function') {
          this.renderer.xr.setReferenceSpaceType('local-floor');
        }
        // Prefer immersive-ar when passthrough is desired (no opaque backgrounds enabled)
        const preferAR = !(this.xrBlackBackgroundEnabled || this.coloredBackgroundEnabled);
        const tryModes = preferAR ? ['immersive-ar', 'immersive-vr'] : ['immersive-vr', 'immersive-ar'];
        for (const mode of tryModes) {
          try {
            const session = await navigator.xr.requestSession(mode, this.sessionInit || { requiredFeatures: ["hand-tracking"], optionalFeatures: ["local-floor", "local"] });
            if (this.renderer && this.renderer.xr && typeof this.renderer.xr.setSession === 'function') {
              await this.renderer.xr.setSession(session);
              try { console.log('[XRBG] started session mode=', mode, 'envBlend=', session && session.environmentBlendMode); } catch (_) {}
              return true;
            }
          } catch (e) {
            try { console.warn('[XRBG] requestSession failed for', mode, e); } catch (_) {}
            continue;
          }
        }
        return false;
      }
      return false;
    } catch (e) {
      try {
        if (this.renderer && this.renderer.xr && typeof this.renderer.xr.setReferenceSpaceType === 'function') {
          this.renderer.xr.setReferenceSpaceType('local');
        }
        const fallbackInit = Object.assign({}, this.sessionInit || {}, { optionalFeatures: ["local", "viewer"] });
        const session = await navigator.xr.requestSession('immersive-vr', fallbackInit);
        if (this.renderer && this.renderer.xr && typeof this.renderer.xr.setSession === 'function') {
          await this.renderer.xr.setSession(session);
          try { console.log('[XRBG] fallback started session mode= immersive-vr envBlend=', session && session.environmentBlendMode); } catch (_) {}
          return true;
        }
      } catch (_) {}
      return false;
    }
  }

  endXRSession() {
    try {
      const session = this.renderer && this.renderer.xr ? this.renderer.xr.getSession() : null;
      if (session && typeof session.end === 'function') session.end();
    } catch (e) {
      console.warn('[Scene] Failed to end XR session', e);
    }
  }

  createBackgroundSphere() {
    const geometry = new THREE.SphereGeometry(50, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, transparent: true, opacity: 1.0 });
    // Avoid depth-only occlusion when using passthrough
    material.depthWrite = false;
    this.backgroundSphere = new THREE.Mesh(geometry, material);
    this.backgroundSphere.position.set(0, 1.6, 0);
    this.scene.add(this.backgroundSphere);
  }

  setupXREvents() {
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.isInXRSession = true;
      try {
        const gl = this.renderer && this.renderer.getContext ? this.renderer.getContext() : null;
        const attrs = gl && gl.getContextAttributes ? gl.getContextAttributes() : {};
        console.log('[XRBG] sessionstart: xrBlack=', this.xrBlackBackgroundEnabled, 'colored=', this.coloredBackgroundEnabled, 'webgl.alpha=', !!(attrs && attrs.alpha));
      } catch (_) {}
      this.applyXRBackgroundMode(false);
      // Some runtimes override clear state on first frame; re-assert shortly after start
      try { setTimeout(() => this.applyXRBackgroundMode(false), 0); } catch (_) {}
      try { setTimeout(() => this.applyXRBackgroundMode(false), 50); } catch (_) {}
      console.log('XR session started - scene');
      this.emit('xrstart');
      try { this.setXRButtonLabel('End Experiment'); } catch (_) {}
      try { this.hideStartExplanation(); } catch (_) {}
    });
    this.renderer.xr.addEventListener('sessionend', () => {
      this.isInXRSession = false;
      try { this.renderer.setClearAlpha(1.0); } catch (_) {}
      this.backgroundSphere.material.opacity = this.isBackgroundVisible ? 1.0 : 0.0;
      try { console.log('[XRBG] sessionend: restored opaque clear alpha=1.0, sphereVisible=', this.isBackgroundVisible); } catch (_) {}
      console.log('XR session ended - scene');
      this.emit('xrend');
      try { this.setXRButtonLabel('Start Experiment'); } catch (_) {}
      try { this.createOrShowStartExplanation(); } catch (_) {}
    });
  }

  customizeXRButton() {
    try {
      const btn = document.getElementById('XRButton');
      if (!btn) return;

      // Apply all styles first
      btn.style.position = 'fixed';
      btn.style.bottom = '32px';
      btn.style.right = 'auto';
      btn.style.left = '50%';
      btn.style.zIndex = '10000';
      btn.style.padding = '24px 36px';
      btn.style.fontSize = '28px';
      btn.style.fontWeight = '900';
      btn.style.borderRadius = '28px';
      btn.style.background = 'linear-gradient(180deg, #6ea2ff, #4a74ff)';
      btn.style.color = '#ffffff';
      btn.style.border = 'none';
      btn.style.letterSpacing = '0.5px';
      btn.style.boxShadow = '0 24px 48px rgba(74,116,255,0.45)';
      btn.style.cursor = 'pointer';
      btn.style.width = 'auto';
      btn.style.minWidth = '200px';
      btn.style.textAlign = 'center';
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.whiteSpace = 'nowrap';
      btn.style.lineHeight = '1.2';

      // Set the text with a small delay to ensure XRButton is fully initialized
      const applyLabelAndLayout = () => {
        this.setXRButtonLabel('Start Experiment');
        btn.setAttribute('aria-label', 'Start Experiment');
        // Re-assert sizing in case library overwrote it
        btn.style.left = '50%';
        btn.style.width = 'auto';
        btn.style.right = 'auto';
        btn.style.transform = 'translateX(-50%)';
      };
      setTimeout(applyLabelAndLayout, 50);
      setTimeout(applyLabelAndLayout, 250);

      // Hover effects
      btn.onmouseenter = () => { btn.style.background = 'linear-gradient(180deg, #7ab0ff, #597fff)'; };
      btn.onmouseleave = () => { btn.style.background = 'linear-gradient(180deg, #6ea2ff, #4a74ff)'; };
      btn.onmousedown = () => { btn.style.transform = 'translateX(-50%) translateY(1px)'; };
      btn.onmouseup = () => { btn.style.transform = 'translateX(-50%)'; };
    } catch (_) {}
  }

  setXRButtonLabel(text) {
    const btn = document.getElementById('XRButton');
    if (btn) { btn.textContent = String(text); btn.setAttribute('aria-label', String(text)); }
  }

  injectXRButtonStyles() {
    try {
      if (document.getElementById('xrbutton-styles')) return;
      const style = document.createElement('style');
      style.id = 'xrbutton-styles';
      style.textContent = `
        #XRButton { position: fixed !important; bottom: 32px !important; left: 50% !important; right: auto !important; transform: translateX(-50%) !important; width: auto !important; min-width: 220px !important; padding: 24px 36px !important; border: none !important; border-radius: 28px !important; background: linear-gradient(180deg, #6ea2ff, #4a74ff) !important; color: #ffffff !important; font-weight: 900 !important; font-size: 28px !important; letter-spacing: 0.5px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; white-space: nowrap !important; line-height: 1.2 !important; box-shadow: 0 24px 48px rgba(74,116,255,0.45) !important; cursor: pointer !important; z-index: 10000 !important; }
        #XRButton:hover { background: linear-gradient(180deg, #7ab0ff, #597fff) !important; }
      `;
      document.head.appendChild(style);
    } catch (_) {}
  }

  // ===== Start Explanation Overlay =====
  injectStartExplanationStyles() {
    try {
      if (document.getElementById('start-explanation-styles')) return;
      const style = document.createElement('style');
      style.id = 'start-explanation-styles';
      style.textContent = `
        #StartExplanation { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); bottom: auto; width: min(1000px, 90vw); padding: 24px 26px; color: #e9edf7; text-align: center; font-size: 40px; line-height: 1.6; z-index: 9999; pointer-events: none; }
        #StartExplanation .sx-card { display: inline-block; background: radial-gradient(1000px 700px at 50% 30%, rgba(35,38,48,0.95), rgba(16,18,24,0.92)); border: 1px solid rgba(255,255,255,0.10); border-radius: 24px; padding: 28px 32px; box-shadow: 0 28px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06); }
        #StartExplanation .sx-title { font-weight: 900; color: #ffffff; margin-bottom: 14px; font-size: 44px; letter-spacing: 0.4px; text-shadow: 0 2px 0 rgba(0,0,0,0.25); }
        #StartExplanation .sx-text { color: #d7deec; text-shadow: 0 1px 0 rgba(0,0,0,0.2); }
        @media (max-width: 640px) { #StartExplanation { font-size: 28px; } #StartExplanation .sx-title { font-size: 32px; } }
      `;
      document.head.appendChild(style);
    } catch (_) {}
  }

  createOrShowStartExplanation() {
    try {
      if (!this.startExplanationEl) {
        const wrap = document.createElement('div');
        wrap.id = 'StartExplanation';
        const card = document.createElement('div');
        card.className = 'sx-card';
        const title = document.createElement('div');
        title.className = 'sx-title';
        title.textContent = 'Welcome';
        const text = document.createElement('div');
        text.className = 'sx-text';
        text.textContent = 'In this experiment you will be asked to evaluate 3D models. The models are divided in blocks, for a total of 10 blocks. The experiment takes about 10 minutes. After certain blocks, you will be asked to fill out a form. Feel free to ask any questions you may have now. When you are ready press the button below.';
        card.appendChild(title);
        card.appendChild(text);
        wrap.appendChild(card);
        document.body.appendChild(wrap);
        this.startExplanationEl = wrap;
      } else {
        // Reset to default Welcome message when showing again
        try {
          const title = this.startExplanationEl.querySelector('.sx-title');
          const text = this.startExplanationEl.querySelector('.sx-text');
          if (title) title.textContent = 'Welcome';
          if (text) text.textContent = 'In this experiment you will be asked to evaluate 3D models. The models are divided in blocks, for a total of 10 blocks. The experiment takes about 10 minutes. After certain blocks, you will be asked to fill out a form. Feel free to ask any questions you may have now. When you are ready press the button below.';
        } catch (_) {}
        this.startExplanationEl.style.display = 'block';
      }
    } catch (_) {}
  }

  hideStartExplanation() {
    try { if (this.startExplanationEl) this.startExplanationEl.style.display = 'none'; } catch (_) {}
  }

  // Update the StartExplanation overlay content
  setStartExplanationContent(titleText, bodyText) {
    try {
      if (!this.startExplanationEl) return;
      const title = this.startExplanationEl.querySelector('.sx-title');
      const text = this.startExplanationEl.querySelector('.sx-text');
      if (title) title.textContent = String(titleText == null ? '' : titleText);
      if (text) text.textContent = String(bodyText == null ? '' : bodyText);
    } catch (_) {}
  }

  // Show a transient "Loading VR..." message during session resume
  showLoadingVR() {
    try {
      this.createOrShowStartExplanation();
      this.setStartExplanationContent('Loading VR..', '');
    } catch (_) {}
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 2, 3);
    this.scene.add(directionalLight);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.updateBackgroundSpherePosition();
    this.updateBlockSpritePosition();
    this.renderer.render(this.scene, this.camera);
  }

  updateBackgroundSpherePosition() {
    if (this.renderer.xr.isPresenting) {
      const xrCamera = this.renderer.xr.getCamera();
      this.backgroundSphere.position.copy(xrCamera.position);
    } else {
      this.backgroundSphere.position.copy(this.camera.position);
    }
  }

  setXRBlackBackgroundEnabled(enabled) {
    this.xrBlackBackgroundEnabled = !!enabled;
    try { console.log('[XRBG] setXRBlackBackgroundEnabled:', this.xrBlackBackgroundEnabled); } catch (_) {}
    this.applyXRBackgroundMode(false);
  }

  setColoredBackgroundEnabled(enabled, color) {
    this.coloredBackgroundEnabled = !!enabled;
    if (typeof color === 'string') { try { this.coloredBackgroundColor.set(color); } catch (_) {} }
    try { console.log('[XRBG] setColoredBackgroundEnabled:', this.coloredBackgroundEnabled, 'color=', this.coloredBackgroundColor && this.coloredBackgroundColor.getHexString && this.coloredBackgroundColor.getHexString()); } catch (_) {}
    this.applyXRBackgroundMode(false);
  }

  // Ensure passthrough unless XR Black or Colored background is enabled
  applyXRBackgroundMode(silent = true) {
    try {
      const forceOpaque = !!this.coloredBackgroundEnabled || !!this.xrBlackBackgroundEnabled;
      if (!silent) { try { console.log('[XRBG] apply: inXR=', this.isInXRSession, 'forceOpaque=', forceOpaque, 'xrBlack=', this.xrBlackBackgroundEnabled, 'colored=', this.coloredBackgroundEnabled); } catch (_) {} }
      if (this.isInXRSession) {
        if (this.renderer) {
          try { if (typeof this.renderer.setClearAlpha === 'function') { this.renderer.setClearAlpha(forceOpaque ? 1.0 : 0.0); if (!silent) console.log('[XRBG] setClearAlpha ->', forceOpaque ? 1.0 : 0.0); } } catch (_) {}
          try { this.renderer.setClearColor(0x000000, forceOpaque ? 1.0 : 0.0); if (!silent) console.log('[XRBG] setClearColor alpha ->', forceOpaque ? 1.0 : 0.0); } catch (_) {}
        }
        if (this.backgroundSphere && this.backgroundSphere.material) {
          // Hide sphere entirely for passthrough to prevent any depth occlusion
          this.backgroundSphere.visible = !!forceOpaque;
          if (this.coloredBackgroundEnabled) {
            this.backgroundSphere.material.color.copy(this.coloredBackgroundColor);
            this.backgroundSphere.material.opacity = 1.0;
          } else if (this.xrBlackBackgroundEnabled) {
            this.backgroundSphere.material.color.set(0x000000);
            this.backgroundSphere.material.opacity = 1.0;
          } else {
            this.backgroundSphere.material.opacity = 0.0;
          }
          if (!silent) { try { console.log('[XRBG] sphere visible=', this.backgroundSphere.visible, 'opacity=', this.backgroundSphere.material.opacity); } catch (_) {} }
        }
      } else {
        // Outside XR, restore default alpha; sphere visibility controlled by isBackgroundVisible
        if (this.renderer) {
          try { if (typeof this.renderer.setClearAlpha === 'function') { this.renderer.setClearAlpha(1.0); if (!silent) console.log('[XRBG] non-XR setClearAlpha -> 1.0'); } } catch (_) {}
          try { this.renderer.setClearColor(0x000000, 1.0); if (!silent) console.log('[XRBG] non-XR setClearColor alpha -> 1.0'); } catch (_) {}
        }
        if (this.backgroundSphere) {
          this.backgroundSphere.visible = !!this.isBackgroundVisible;
        }
      }
    } catch (_) {}
  }

  // ===== In-VR Block Message (Sprite) =====
  createBlockSprite(text) {
    try { console.log('[BlockHUD] Creating VR sprite with text:', text); } catch (_) {}
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    // Background rounded rectangle
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const radius = 28; const w = canvas.width; const h = canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(w - radius, 0);
    ctx.quadraticCurveTo(w, 0, w, radius);
    ctx.lineTo(w, h - radius);
    ctx.quadraticCurveTo(w, h, w - radius, h);
    ctx.lineTo(radius, h);
    ctx.quadraticCurveTo(0, h, 0, h - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath(); ctx.fill();
    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 140px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.2, 0.55, 1); // meters
    sprite.renderOrder = 9999;
    return sprite;
  }

  showBlockMessage(blockNumber, durationMs = 1000) {
    try { console.log('[BlockHUD] showBlockMessage start: block=', blockNumber, 'durationMs=', durationMs); } catch (_) {}
    try { this.hideBlockMessage(); } catch (_) {}
    try {
      this.blockSprite = this.createBlockSprite(`BLOCK ${Number(blockNumber)}`);
      if (this.blockSprite && this.scene) {
        this.scene.add(this.blockSprite);
        this.updateBlockSpritePosition();
        if (this.blockTimer) { clearTimeout(this.blockTimer); this.blockTimer = null; }
        this.blockTimer = setTimeout(() => this.hideBlockMessage(), Math.max(0, Number(durationMs) || 1000));
        console.log('[BlockHUD] VR sprite added to scene');
        return true;
      }
    } catch (e) { console.warn('[BlockHUD] Failed to show block message', e); }
    return false;
  }

  hideBlockMessage() {
    try {
      if (this.blockTimer) { clearTimeout(this.blockTimer); this.blockTimer = null; }
      if (this.blockSprite) {
        const parent = this.blockSprite.parent; if (parent && parent.remove) parent.remove(this.blockSprite);
        if (this.blockSprite.material && this.blockSprite.material.map) this.blockSprite.material.map.dispose();
        if (this.blockSprite.material) this.blockSprite.material.dispose();
        this.blockSprite = null;
        console.log('[BlockHUD] VR sprite removed');
      }
    } catch (e) { console.warn('[BlockHUD] Failed to hide block message', e); }
  }

  updateBlockSpritePosition() {
    try {
      if (!this.blockSprite) return;
      const cam = (this.renderer && this.renderer.xr && this.renderer.xr.isPresenting) ? this.renderer.xr.getCamera() : this.camera;
      if (!cam) return;
      const camWorldPos = new THREE.Vector3(); cam.getWorldPosition(camWorldPos);
      const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
      const pos = camWorldPos.clone().add(dir.multiplyScalar(1.8));
      this.blockSprite.position.copy(pos);
    } catch (e) { /* avoid log spam per frame */ }
  }
}


