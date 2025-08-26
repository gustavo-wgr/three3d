import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { vertexShader, fragmentShader } from "./shaders.js";

export class PointcloudManager {
  constructor(scene) {
    this.scene = scene;
    this.originalGeometry = null;
    this.pointCloud = null;
    this.pointCloudMaterial = null;
    this.clock = new THREE.Clock();
    this.baseRotationX = 0;
    this.currentGlbUrl = null; // Store current GLB URL for rotation logic
    // Morphing state
    this.morphFromPositions = null;
    this.morphToPositions = null;
    this.morphStartTime = 0;
    this.morphDurationSec = 0;
    this.isMorphing = false;
    // Canonical bbox for pointcloud video normalization
    this.videoCanonicalSize = null; // THREE.Vector3 of first video frame bbox size
    // Lowest-Z point color storage
    this.lowestZColor = null;
  }

  // Removed scaling — preserve original geometry scale

  resetVideoCanonical() {
    this.videoCanonicalSize = null;
  }

  // Function to load a GLB model
  loadGlbModel(glbUrl, params, onLoadCallback) {
    console.log(`Loading GLB model: ${glbUrl}`);
    document.getElementById("info").textContent = `Loading ${glbUrl}...`;

    // Store current GLB URL for rotation logic
    this.currentGlbUrl = glbUrl;

    // Remove existing point cloud
    if (this.pointCloud) {
      this.scene.remove(this.pointCloud);
      this.pointCloud = null;
    }

    // Reset original geometry
    this.originalGeometry = null;

    const loader = new GLTFLoader();

    loader.load(
      glbUrl,
      (gltf) => {
        // Extract the point cloud geometry
        const model = gltf.scene;
        let foundPointCloud = false;

        model.traverse((child) => {
          if ((child.isPoints || child.isMesh) && !foundPointCloud) {
            foundPointCloud = true;
            console.log(`Found point cloud in ${glbUrl}`);

            const geometry = child.geometry;
            
            // Preserve original geometry scale
            this.originalGeometry = geometry.clone();

            // Handle color attributes
            if (geometry.attributes.color) {
              console.log("Color attribute found");
              this.originalGeometry.setAttribute("color", geometry.attributes.color.clone());
            } else if (geometry.attributes.COLOR_0) {
              console.log("COLOR_0 attribute found, mapping to color");
              this.originalGeometry.setAttribute("color", geometry.attributes.COLOR_0.clone());
            } else {
              console.log("No color attribute found, creating default colors");

              // Create white colors
              const count = this.originalGeometry.attributes.position.count;
              const colors = new Float32Array(count * 3);
              for (let i = 0; i < count * 3; i++) {
                colors[i] = 1.0;
              }

              this.originalGeometry.setAttribute(
                "color",
                new THREE.BufferAttribute(colors, 3)
              );
            }

            // Find and log the color of the point with the lowest Z value
            try {
              const positionAttribute = this.originalGeometry.attributes.position;
              const colorAttribute = this.originalGeometry.attributes.color;
              if (positionAttribute && colorAttribute && positionAttribute.count > 0 && colorAttribute.count === positionAttribute.count) {
                let minimumZ = Infinity;
                let minimumIndex = -1;
                for (let i = 0; i < positionAttribute.count; i++) {
                  const zValue = positionAttribute.getZ(i);
                  if (zValue < minimumZ) {
                    minimumZ = zValue;
                    minimumIndex = i;
                  }
                }
                if (minimumIndex >= 0) {
                  const redValue = colorAttribute.getX(minimumIndex);
                  const greenValue = colorAttribute.getY(minimumIndex);
                  const blueValue = colorAttribute.getZ(minimumIndex);
                  console.log(`Lowest-Z point color (r,g,b): ${redValue}, ${greenValue}, ${blueValue}`);
                  this.lowestZColor = new THREE.Color(redValue, greenValue, blueValue);
                }
              }
            } catch (e) {
              console.warn('Failed to compute lowest-Z point color', e);
            }

            // Create the subsampled point cloud
            this.updatePointCloudSampling(params.subsampleRate, params);
            document.getElementById("info").textContent = `Loaded: ${glbUrl}`;
            
            if (onLoadCallback) {
              onLoadCallback(this.pointCloud, 0);
            }

            console.log(`Finished loading GLB model: ${glbUrl}`);
          }
        });

        if (!foundPointCloud) {
          console.warn(`No point cloud found in ${glbUrl}!`);
          this.createDemoPointCloud(params);
          document.getElementById("info").textContent = `No points in ${glbUrl}, using demo`;
          console.log(`Finished loading GLB model (no points, demo used): ${glbUrl}`);
        }
      },
      (xhr) => {
        // Quiet progress: no console percent logs
      },
      (error) => {
        console.error(`Error loading ${glbUrl}:`, error);
        this.createDemoPointCloud(params);
        document.getElementById("info").textContent = `Failed to load ${glbUrl}, using demo`;
      }
    );
  }

  // Create a demo point cloud if GLB fails or has no points
  createDemoPointCloud(params) {
    console.log("Creating demo point cloud");
    // Clear current GLB URL since we're creating a demo point cloud
    this.currentGlbUrl = null;
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];

    // Create a sphere of points
    for (let i = 0; i < 10000; i++) {
      const radius = 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      vertices.push(x, y, z);

      // Rainbow colors
      colors.push(
        Math.sin(theta) * 0.5 + 0.5,
        Math.cos(phi) * 0.5 + 0.5,
        Math.sin(phi + theta) * 0.5 + 0.5
      );
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    this.originalGeometry = geometry.clone();

    // Apply subsampling
    this.updatePointCloudSampling(params.subsampleRate, params);
  }

  // Function to subsample the point cloud
  updatePointCloudSampling(rate, params, position = { x: 0, y: 2.1, z: -3 }) {
    if (!this.originalGeometry) return;

    const existingGeometry = this.pointCloud ? this.pointCloud.geometry : null;
    const newGeometry = existingGeometry || new THREE.BufferGeometry();

    // Get the original attributes
    const originalPositions = this.originalGeometry.attributes.position;
    const originalColors = this.originalGeometry.attributes.color;

    // Calculate how many points to keep
    const originalCount = originalPositions.count;
    const requestedTargetCount = Math.max(1, Math.floor(originalCount * rate));
    const existingTargetCount = existingGeometry ? existingGeometry.getAttribute("position").count : null;
    const targetCount = requestedTargetCount;

    // Create arrays for the new attributes
    const newPositions = new Float32Array(targetCount * 3);
    const newColors = new Float32Array(targetCount * 3);
    // Evaporation removed

    // Calculate stride for even sampling
    const stride = originalCount / targetCount;

    // Evaporation removed

    // Sample points using stride
    for (let i = 0; i < targetCount; i++) {
      const sourceIndex = Math.min(
        originalCount - 1,
        Math.floor(i * stride)
      );

      // Copy position
      newPositions[i * 3] = originalPositions.getX(sourceIndex);
      newPositions[i * 3 + 1] = originalPositions.getY(sourceIndex);
      newPositions[i * 3 + 2] = originalPositions.getZ(sourceIndex);

      // Copy color
      if (originalColors) {
        newColors[i * 3] = originalColors.getX(sourceIndex);
        newColors[i * 3 + 1] = originalColors.getY(sourceIndex);
        newColors[i * 3 + 2] = originalColors.getZ(sourceIndex);
      } else {
        // Default white
        newColors[i * 3] = 1.0;
        newColors[i * 3 + 1] = 1.0;
        newColors[i * 3 + 2] = 1.0;
      }

      // Evaporation removed
    }

    if (!existingGeometry) {
      // Set geometry attributes for initial creation
      const posAttr = new THREE.BufferAttribute(newPositions, 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      newGeometry.setAttribute("position", posAttr);

      const colAttr = new THREE.BufferAttribute(newColors, 3);
      colAttr.setUsage(THREE.DynamicDrawUsage);
      newGeometry.setAttribute("color", colAttr);

      // Evaporation attribute removed

      // Create shader material
      this.pointCloudMaterial = new THREE.ShaderMaterial({
        uniforms: {
          pointSize: { value: params.pointSize },
          time: { value: 0.0 },
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        vertexColors: true,
      });

      // Create point cloud
      this.pointCloud = new THREE.Points(newGeometry, this.pointCloudMaterial);
      this.pointCloud.position.set(position.x, position.y, position.z);
      const initialScale = (params && typeof params.modelScale === 'number') ? params.modelScale : 1.0;
      this.pointCloud.scale.set(initialScale, initialScale, initialScale);
      this.pointCloud.rotation.set(0, 0, 0);
      // Ensure model faces +Z (rotate 180 degrees around Y) - only for unik3d models
      if (this.currentGlbUrl && this.currentGlbUrl.includes('unik3d')) {
        this.pointCloud.rotation.y = Math.PI;
        console.log(`Applied 180° Y-axis rotation to unik3d model: ${this.currentGlbUrl}`);
      }
      this.baseRotationX = this.pointCloud.rotation.x || 0;
      // Apply initial flip state if requested
      if (params && params.flipUpsideDown) {
        this.pointCloud.rotation.x = this.baseRotationX + Math.PI;
      }
      this.scene.add(this.pointCloud);

      // Initialize morph state to stable
      this.isMorphing = false;
      this.morphFromPositions = null;
      this.morphToPositions = null;

      console.log(`Created point cloud with ${targetCount} points`);
    } else {
      // In-place update: morph or snap based on params.morphEnabled
      const currentPosAttr = existingGeometry.getAttribute("position");
      const currentArray = currentPosAttr.array;

      // If geometry size changed request, rebuild instead of morph
      if (currentArray.length !== newPositions.length) {
        this.scene.remove(this.pointCloud);
        this.pointCloud.geometry.dispose();
        this.pointCloud.material.dispose();
        this.pointCloud = null;
        // Recurse to create fresh with requested size
        this.updatePointCloudSampling(rate, params, position);
        return;
      }

      const morphEnabled = !params || params.morphEnabled === undefined ? true : !!params.morphEnabled;
      if (morphEnabled) {
        this.morphFromPositions = new Float32Array(currentArray);
        this.morphToPositions = newPositions;
        this.morphStartTime = this.clock.getElapsedTime();
        const fps = Math.max(1, (params && params.playbackSpeed) ? params.playbackSpeed : 16);
        this.morphDurationSec = 1.0 / fps;
        this.isMorphing = true;
      } else {
        // Snap instantly to new positions
        currentArray.set(newPositions);
        currentPosAttr.needsUpdate = true;
        this.isMorphing = false;
        this.morphFromPositions = null;
        this.morphToPositions = null;
      }

      // Update colors immediately if provided
      const colorAttr = existingGeometry.getAttribute("color");
      if (colorAttr && newColors.length === colorAttr.array.length) {
        colorAttr.array.set(newColors);
        colorAttr.needsUpdate = true;
      }
    }
  }

  clearPointCloud() {
    try {
      if (this.pointCloud) {
        this.scene.remove(this.pointCloud);
        if (this.pointCloud.geometry) {
          this.pointCloud.geometry.dispose();
        }
        if (this.pointCloud.material) {
          this.pointCloud.material.dispose();
        }
        this.pointCloud = null;
      }
      this.pointCloudMaterial = null;
      this.originalGeometry = null;
      this.isMorphing = false;
      this.morphFromPositions = null;
      this.morphToPositions = null;
      this.currentGlbUrl = null;
      console.log('Point cloud cleared');
    } catch (e) {
      console.warn('Failed to clear point cloud', e);
    }
  }

  updatePointCloudPosition(x, y, z) {
    if (this.pointCloud) {
      this.pointCloud.position.set(x, y, z);
    }
  }

  updatePointCloudScale(scale) {
    if (this.pointCloud && typeof scale === 'number' && isFinite(scale)) {
      this.pointCloud.scale.set(scale, scale, scale);
    }
  }

  updateMaterialUniforms(params) {
    if (this.pointCloudMaterial) {
      this.pointCloudMaterial.uniforms.pointSize.value = params.pointSize;
    }
  }

  updateTime() {
    const elapsed = this.clock.getElapsedTime();
    if (this.pointCloudMaterial) {
      this.pointCloudMaterial.uniforms.time.value = elapsed;
    }
    // Handle morphing interpolation per frame
    if (this.isMorphing && this.pointCloud) {
      const t = Math.min(1.0, (elapsed - this.morphStartTime) / Math.max(0.0001, this.morphDurationSec));
      const posAttr = this.pointCloud.geometry.getAttribute("position");
      const arr = posAttr.array;
      const fromArr = this.morphFromPositions;
      const toArr = this.morphToPositions;
      for (let i = 0; i < arr.length; i++) {
        arr[i] = fromArr[i] + (toArr[i] - fromArr[i]) * t;
      }
      posAttr.needsUpdate = true;
      if (t >= 1.0) {
        this.isMorphing = false;
        this.morphFromPositions = null;
        this.morphToPositions = null;
      }
    }
  }

  getPointCloud() {
    return this.pointCloud;
  }

  getMaterial() {
    return this.pointCloudMaterial;
  }

  setFlipUpsideDown(enabled) {
    if (!this.pointCloud) return;
    if (this.baseRotationX === undefined || this.baseRotationX === null) {
      this.baseRotationX = this.pointCloud.rotation.x || 0;
    }
    this.pointCloud.rotation.x = this.baseRotationX + (enabled ? Math.PI : 0);
  }
}
