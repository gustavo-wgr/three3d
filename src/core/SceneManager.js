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
        const session = await navigator.xr.requestSession('immersive-vr', this.sessionInit || { requiredFeatures: ["hand-tracking"], optionalFeatures: ["local-floor", "local"] });
        if (this.renderer && this.renderer.xr && typeof this.renderer.xr.setSession === 'function') {
          await this.renderer.xr.setSession(session);
          return true;
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
    this.backgroundSphere = new THREE.Mesh(geometry, material);
    this.backgroundSphere.position.set(0, 1.6, 0);
    this.scene.add(this.backgroundSphere);
  }

  setupXREvents() {
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.isInXRSession = true;
      if (this.coloredBackgroundEnabled) {
        this.backgroundSphere.material.color.copy(this.coloredBackgroundColor);
        this.backgroundSphere.material.opacity = 1.0;
      } else {
        this.backgroundSphere.material.opacity = this.xrBlackBackgroundEnabled ? 1.0 : 0.0;
      }
      console.log('XR session started - scene');
      this.emit('xrstart');
    });
    this.renderer.xr.addEventListener('sessionend', () => {
      this.isInXRSession = false;
      this.backgroundSphere.material.opacity = this.isBackgroundVisible ? 1.0 : 0.0;
      console.log('XR session ended - scene');
      this.emit('xrend');
    });
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
    if (this.isInXRSession && this.backgroundSphere && this.backgroundSphere.material) {
      if (this.coloredBackgroundEnabled) {
        this.backgroundSphere.material.color.copy(this.coloredBackgroundColor);
        this.backgroundSphere.material.opacity = 1.0;
      } else {
        this.backgroundSphere.material.opacity = this.xrBlackBackgroundEnabled ? 1.0 : 0.0;
      }
    }
  }

  setColoredBackgroundEnabled(enabled, color) {
    this.coloredBackgroundEnabled = !!enabled;
    if (typeof color === 'string') { try { this.coloredBackgroundColor.set(color); } catch (_) {} }
    if (this.backgroundSphere && this.backgroundSphere.material) {
      if (this.coloredBackgroundEnabled) {
        this.backgroundSphere.material.color.copy(this.coloredBackgroundColor);
        this.backgroundSphere.material.opacity = 1.0;
      } else if (this.isInXRSession) {
        this.backgroundSphere.material.opacity = this.xrBlackBackgroundEnabled ? 1.0 : 0.0;
      }
    }
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


