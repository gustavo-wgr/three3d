import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class PointcloudPlayer {
  constructor(scene, loader, onFrameLoad, onFrameChange) {
    this.scene = scene;
    this.loader = loader || new GLTFLoader();
    this.onFrameLoad = onFrameLoad;
    this.onFrameChange = onFrameChange;

    // Playback state
    this.frameUrls = [];
    this.currentFrame = 0;
    this.totalFrames = 0;
    this.fps = 16;
    this.frameTime = 1000 / this.fps; // ms per frame
    this.isPlaying = false;
    this.isLoading = false;

    // Animation
    this.lastTickTime = 0;
    this.rafId = null;
  }

  initialize(frameUrls, fps = 16) {
    this.frameUrls = frameUrls || [];
    this.totalFrames = this.frameUrls.length;
    this.setFPS(fps);
    this.currentFrame = 0;
    this.isPlaying = false;
    // Preload first frame
    if (this.totalFrames > 0) {
      this.loadFrame(0);
    }
  }

  setFPS(fps) {
    this.fps = Math.max(1, fps | 0);
    this.frameTime = 1000 / this.fps;
  }

  play() {
    if (this.isPlaying || this.totalFrames === 0) return;
    this.isPlaying = true;
    this.lastTickTime = performance.now();
    this.loop();
  }

  pause() {
    this.isPlaying = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  stop() {
    this.pause();
    this.seekToFrame(0);
  }

  nextFrame() {
    if (this.totalFrames === 0) return;
    const next = (this.currentFrame + 1) % this.totalFrames;
    this.seekToFrame(next);
  }

  previousFrame() {
    if (this.totalFrames === 0) return;
    const prev = (this.currentFrame - 1 + this.totalFrames) % this.totalFrames;
    this.seekToFrame(prev);
  }

  async seekToFrame(frameIndex) {
    if (this.totalFrames === 0) return;
    const clamped = Math.max(0, Math.min(frameIndex, this.totalFrames - 1));
    await this.loadFrame(clamped);
  }

  loop = () => {
    if (!this.isPlaying) return;
    const now = performance.now();
    const delta = now - this.lastTickTime;
    if (delta >= this.frameTime) {
      const framesToAdvance = Math.floor(delta / this.frameTime);
      this.lastTickTime += framesToAdvance * this.frameTime;
      const next = (this.currentFrame + framesToAdvance) % this.totalFrames;
      this.seekToFrame(next);
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  loadGLB(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
  }

  async loadFrame(frameIndex) {
    if (this.isLoading) return;
    if (frameIndex < 0 || frameIndex >= this.totalFrames) return;

    this.isLoading = true;
    try {
      const url = this.frameUrls[frameIndex];
      const gltf = await this.loadGLB(url);

      const pointLike = this.extractFirstPointLike(gltf);
      if (pointLike && this.onFrameLoad) {
        this.onFrameLoad(pointLike, frameIndex);
      }

      this.currentFrame = frameIndex;
      if (this.onFrameChange) {
        this.onFrameChange(this.currentFrame, this.totalFrames);
      }
    } catch (e) {
      console.error("PointcloudPlayer: failed to load frame", frameIndex, e);
    } finally {
      this.isLoading = false;
    }
  }

  extractFirstPointLike(gltf) {
    let found = null;
    gltf.scene.traverse((child) => {
      if (!found && (child.isPoints || child.isMesh)) {
        found = child;
      }
    });
    return found;
  }
}

