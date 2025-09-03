import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { vertexShader, fragmentShader } from "../shaders.js";

// Minimal GLB loader for point clouds/meshes with a simple shader material.
// Intentionally trimmed: no morphing/video/demo; focused on clarity and essentials.
export class ModelLoader {
  constructor(scene) {
    this.scene = scene;
    this.object3D = null; // THREE.Points or THREE.Mesh
    this.material = null; // ShaderMaterial (points) or MeshBasicMaterial
    this.geometry = null; // BufferGeometry
    // Keep an unmodified copy for resampling
    this.originalGeometry = null; // Back-compat name used by callers
    this.fullGeometry = null; // Alias for clarity
    this.baseRotationX = 0;
    this.mirrorZ = false;
  }

  clearPointCloud() {
    try {
      if (this.object3D) {
        this.scene.remove(this.object3D);
        if (this.object3D.geometry) this.object3D.geometry.dispose();
        if (this.object3D.material) this.object3D.material.dispose();
        this.object3D = null;
      }
      this.material = null;
      this.geometry = null;
      this.baseRotationX = 0;
    } catch (e) {
      console.warn('[ModelLoader] Failed to clear object', e);
    }
  }

  getPointCloud() {
    return this.object3D;
  }

  getMaterial() {
    return this.material;
  }

  setVisible(visible) {
    if (this.object3D) this.object3D.visible = !!visible;
  }

  // Compatibility no-op: kept so legacy render loops don't error
  updateTime() {
    // Intentionally empty - no time-based effects in the trimmed loader
  }

  updatePointCloudPosition(x, y, z) {
    if (this.object3D) this.object3D.position.set(x, y, z);
  }

  updatePointCloudScale(scale) {
    if (!this.object3D || !isFinite(scale)) return;
    const zScale = this.mirrorZ ? -scale : scale;
    this.object3D.scale.set(scale, scale, zScale);
  }

  setFlipUpsideDown(enabled) {
    if (!this.object3D) return;
    if (this.baseRotationX === undefined || this.baseRotationX === null) {
      this.baseRotationX = this.object3D.rotation.x || 0;
    }
    this.object3D.rotation.x = this.baseRotationX + (enabled ? Math.PI : 0);
  }

  setMirrorZ(enabled) {
    this.mirrorZ = !!enabled;
    if (this.object3D) {
      const currentAbsZ = Math.abs(this.object3D.scale.z || 1);
      this.object3D.scale.z = this.mirrorZ ? -currentAbsZ : currentAbsZ;
    }
  }

  // Back-compat API: keep the same signature used by the old controller
  loadGlbModel(glbUrl, params, onLoadCallback) {
    const loader = new GLTFLoader();
    console.log(`[ModelLoader] Loading ${glbUrl}`);

    // Remove previous object
    this.clearPointCloud();

    loader.load(
      glbUrl,
      (gltf) => {
        // Find first Points or Mesh
        let found = null;
        gltf.scene.traverse((child) => {
          if (!found && (child.isPoints || child.isMesh)) {
            found = child;
          }
        });

        if (!found) {
          console.warn(`[ModelLoader] No Points/Mesh found in ${glbUrl}`);
          return;
        }

        const geometry = found.geometry.clone();

        // Ensure color attribute exists
        if (!geometry.attributes.color && geometry.attributes.COLOR_0) {
          geometry.setAttribute('color', geometry.attributes.COLOR_0.clone());
        }
        if (!geometry.attributes.color) {
          const count = geometry.attributes.position.count;
          const colors = new Float32Array(count * 3);
          for (let i = 0; i < count * 3; i++) colors[i] = 1.0;
          geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        }

        // Material: prefer point shader if rendering points, otherwise basic mesh
        let material;
        let object3D;
        if (found.isPoints || geometry.getAttribute('position')) {
          // Apply initial subsampling if requested
          const rate = (params && isFinite(params.subsampleRate)) ? Math.max(0.0, Math.min(1.0, params.subsampleRate)) : 1.0;
          const renderGeometry = (rate < 0.999) ? this.createSubsampledGeometry(geometry, rate) : geometry;
          material = new THREE.ShaderMaterial({
            uniforms: {
              pointSize: { value: (params && params.pointSize) || 0.006 }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            vertexColors: true
          });
          object3D = new THREE.Points(renderGeometry, material);
          // Track geometries for future resampling
          this.originalGeometry = geometry;
          this.fullGeometry = geometry;
          this.geometry = renderGeometry;
        } else {
          material = new THREE.MeshBasicMaterial({ vertexColors: true });
          object3D = new THREE.Mesh(geometry, material);
          // Mesh path: keep references anyway
          this.originalGeometry = geometry;
          this.fullGeometry = geometry;
          this.geometry = geometry;
        }

        // Initial transforms
        const pos = { x: 0, y: 2.1, z: -3 };
        object3D.position.set(pos.x, pos.y, pos.z);
        const scale = (params && typeof params.modelScale === 'number') ? params.modelScale : 1.0;
        object3D.scale.set(scale, scale, scale);
        object3D.rotation.set(0, (params && params.initialYawRadians) || 0, 0);
        this.baseRotationX = object3D.rotation.x || 0;
        if (params && params.flipUpsideDown) object3D.rotation.x = this.baseRotationX + Math.PI;
        if (params && typeof params.mirrorZ === 'boolean') this.mirrorZ = !!params.mirrorZ;
        if (this.mirrorZ) object3D.scale.z = -Math.abs(object3D.scale.z || 1);

        // Finalize
        this.material = material;
        this.object3D = object3D;
        this.scene.add(this.object3D);

        console.log(`[ModelLoader] Loaded ${glbUrl}`);
        if (onLoadCallback) onLoadCallback(this.object3D, 0);
      },
      undefined,
      (err) => {
        console.error('[ModelLoader] Failed to load', glbUrl, err);
      }
    );
  }

  // Build a new geometry that contains a fraction (rate) of the original points
  createSubsampledGeometry(sourceGeometry, rate) {
    try {
      const clamped = Math.max(0.0, Math.min(1.0, Number(rate)));
      const pos = sourceGeometry.getAttribute('position');
      if (!pos) return sourceGeometry;
      const colorAttr = sourceGeometry.getAttribute('color');
      const total = pos.count;
      const target = Math.max(1, Math.min(total, Math.floor(total * clamped)));
      if (target >= total) return sourceGeometry;

      const stride = total / target;
      const positions = new Float32Array(target * 3);
      // Preserve original color attribute type and normalization semantics
      const colorItemSize = colorAttr ? (colorAttr.itemSize || 3) : 3; // 3 or 4
      const ColorArrayType = colorAttr ? (colorAttr.array && colorAttr.array.constructor) : null;
      const colorArrayLength = colorAttr ? (target * colorItemSize) : 0;
      const colors = colorAttr ? new ColorArrayType(colorArrayLength) : null;

      for (let i = 0; i < target; i++) {
        const idx = Math.floor(i * stride);
        const srcBase = idx * 3;
        const dstBase = i * 3;
        positions[dstBase] = pos.array[srcBase];
        positions[dstBase + 1] = pos.array[srcBase + 1];
        positions[dstBase + 2] = pos.array[srcBase + 2];
        if (colors && colorAttr) {
          const cSrcBase = idx * colorItemSize;
          const cDstBase = i * colorItemSize;
          // Copy RGB, preserve A if present
          colors[cDstBase] = colorAttr.array[cSrcBase] ?? (ColorArrayType === Float32Array ? 1.0 : 255);
          colors[cDstBase + 1] = colorAttr.array[cSrcBase + 1] ?? (ColorArrayType === Float32Array ? 1.0 : 255);
          colors[cDstBase + 2] = colorAttr.array[cSrcBase + 2] ?? (ColorArrayType === Float32Array ? 1.0 : 255);
          if (colorItemSize === 4) {
            colors[cDstBase + 3] = colorAttr.array[cSrcBase + 3] ?? (ColorArrayType === Float32Array ? 1.0 : 255);
          }
        }
      }

      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      if (colors) {
        const colorBA = new THREE.BufferAttribute(colors, colorItemSize);
        // Maintain normalized flag (critical when original colors are UNSIGNED_BYTE)
        if (colorAttr && typeof colorAttr.normalized === 'boolean') {
          colorBA.normalized = colorAttr.normalized;
        }
        out.setAttribute('color', colorBA);
      }
      try { out.computeBoundingSphere(); } catch (_) {}
      try { out.computeBoundingBox(); } catch (_) {}
      return out;
    } catch (e) {
      console.warn('[ModelLoader] Subsampling failed, using original geometry', e);
      return sourceGeometry;
    }
  }

  // Update the active point cloud geometry to reflect a new sampling rate
  updatePointCloudSampling(rate /* , params, position */) {
    if (!this.object3D || !this.originalGeometry) return;
    const clamped = Math.max(0.0, Math.min(1.0, Number(rate)));
    const nextGeometry = (clamped < 0.999)
      ? this.createSubsampledGeometry(this.originalGeometry, clamped)
      : this.originalGeometry;

    const old = this.object3D.geometry;
    if (old === nextGeometry) return;
    this.object3D.geometry = nextGeometry;
    this.geometry = nextGeometry;
    // Dispose old sampled buffers to free memory, but keep the original
    if (old && old !== this.originalGeometry) {
      try { old.dispose(); } catch (_) {}
    }
  }
}


