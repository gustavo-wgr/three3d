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
    // Morphing state
    this.morphFromPositions = null;
    this.morphToPositions = null;
    this.morphStartTime = 0;
    this.morphDurationSec = 0;
    this.isMorphing = false;
    // Canonical bbox for pointcloud video normalization
    this.videoCanonicalSize = null; // THREE.Vector3 of first video frame bbox size
  }

  // Function to calculate bounding box and scale geometry
  // - Normal mode: fit demo sphere (uniform scale by max dimension to fixed diameter)
  // - Video mode (glbUrl includes 'pointcloud_video'): enforce identical bounding boxes across frames
  scaleGeometryToFitDemoSphere(geometry, glbUrl = '') {
    // Calculate bounding box
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    
    // Get the size of the geometry
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    // Get the center of the geometry
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    
    // Demo sphere has radius 2, so diameter is 4
    const targetSize = 4.0;
    const isVideo = typeof glbUrl === 'string' && glbUrl.includes('pointcloud_video');
    const scaledGeometry = geometry.clone();
    const positions = scaledGeometry.attributes.position;
    
    if (isVideo) {
      // Initialize canonical size from first frame
      if (!this.videoCanonicalSize) {
        this.videoCanonicalSize = size.clone();
      }
      // Per-axis scale to map current bbox size to canonical size
      const sxBase = this.videoCanonicalSize.x > 0 && size.x > 0 ? this.videoCanonicalSize.x / size.x : 1.0;
      const syBase = this.videoCanonicalSize.y > 0 && size.y > 0 ? this.videoCanonicalSize.y / size.y : 1.0;
      const szBase = this.videoCanonicalSize.z > 0 && size.z > 0 ? this.videoCanonicalSize.z / size.z : 1.0;
      // Then uniform scale to fit demo target size consistently across frames
      const canonicalMax = Math.max(this.videoCanonicalSize.x, this.videoCanonicalSize.y, this.videoCanonicalSize.z);
      const uniform = canonicalMax > 0 ? targetSize / canonicalMax : 1.0;
      const sx = sxBase * uniform;
      const sy = syBase * uniform;
      const sz = szBase * uniform;
      
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        // Center and per-axis scale to canonical bbox, then apply uniform demo scale
        const newX = (x - center.x) * sx;
        const newY = (y - center.y) * sy;
        const newZ = (z - center.z) * sz;
        
        // Mirror Z for consistency with rest of app
        const finalX = newX;
        const finalY = newY;
        const finalZ = -newZ;
        positions.setXYZ(i, finalX, finalY, finalZ);
      }
      // Update bounding box
      scaledGeometry.computeBoundingBox();
      return scaledGeometry;
    }
    
    const maxDimension = Math.max(size.x, size.y, size.z);
    const scale = targetSize / maxDimension;
    
    console.log(`Original size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
    console.log(`Scaling by: ${scale.toFixed(3)}`);
    
    // Create a scaled and centered geometry (normal mode)
    
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Center and scale
      const newX = (x - center.x) * scale;
      const newY = (y - center.y) * scale;
      const newZ = (z - center.z) * scale;
      
      // Mirror the Z-axis to flip the model front-to-back
      let finalX = newX;
      let finalY = newY;
      let finalZ = -newZ;
      
      // Special case: flip Y-axis for GLB files from the vggt folder that are upside down
      if (glbUrl.includes('vggt/')) {
        finalY = -newY;
      }
      
      positions.setXYZ(i, finalX, finalY, finalZ);
    }
    
    // Update bounding box
    scaledGeometry.computeBoundingBox();
    
    return scaledGeometry;
  }

  resetVideoCanonical() {
    this.videoCanonicalSize = null;
  }

  // Function to load a GLB model
  loadGlbModel(glbUrl, params, onLoadCallback) {
    console.log(`Loading GLB model: ${glbUrl}`);
    document.getElementById("info").textContent = `Loading ${glbUrl}...`;

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
            
            // Scale the geometry to fit the demo sphere size
            const scaledGeometry = this.scaleGeometryToFitDemoSphere(geometry, glbUrl);
            this.originalGeometry = scaledGeometry.clone();

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

            // Create the subsampled point cloud with evaporation effect
            this.updatePointCloudSampling(params.subsampleRate, params);
            document.getElementById("info").textContent = `Loaded: ${glbUrl}`;
            
            if (onLoadCallback) {
              onLoadCallback(this.pointCloud, 0);
            }
          }
        });

        if (!foundPointCloud) {
          console.warn(`No point cloud found in ${glbUrl}!`);
          this.createDemoPointCloud(params);
          document.getElementById("info").textContent = `No points in ${glbUrl}, using demo`;
        }
      },
      (xhr) => {
        const percentComplete = Math.round((xhr.loaded / xhr.total) * 100);
        console.log(`${percentComplete}% loaded`);
        document.getElementById("info").textContent = `Loading ${glbUrl}: ${percentComplete}%`;
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

    // Apply subsampling and evaporation
    this.updatePointCloudSampling(params.subsampleRate, params);
  }

  // Function to subsample the point cloud and add evaporation effect
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
    const evaporationFactors = existingGeometry ? null : new Float32Array(targetCount);

    // Calculate stride for even sampling
    const stride = originalCount / targetCount;

    // Calculate evaporation count
    let evaporatingIndices = null;
    if (!existingGeometry) {
      const evaporationCount = Math.floor(targetCount * params.evaporationAmount);
      console.log(`Setting ${evaporationCount} points to evaporate out of ${targetCount} total`);
      // Random indices for evaporating points
      evaporatingIndices = new Set();
      while (evaporatingIndices.size < evaporationCount) {
        evaporatingIndices.add(Math.floor(Math.random() * targetCount));
      }
    }

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

      // Set evaporation factor
      if (!existingGeometry && evaporationFactors) {
        if (evaporatingIndices.has(i)) {
          evaporationFactors[i] = 0.2 + Math.random() * 0.8; // Random speed factor
        } else {
          evaporationFactors[i] = 0.0; // No evaporation
        }
      }
    }

    if (!existingGeometry) {
      // Set geometry attributes for initial creation
      const posAttr = new THREE.BufferAttribute(newPositions, 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      newGeometry.setAttribute("position", posAttr);

      const colAttr = new THREE.BufferAttribute(newColors, 3);
      colAttr.setUsage(THREE.DynamicDrawUsage);
      newGeometry.setAttribute("color", colAttr);

      const evapAttr = new THREE.BufferAttribute(evaporationFactors, 1);
      newGeometry.setAttribute("evaporationFactor", evapAttr);

      // Create shader material
      this.pointCloudMaterial = new THREE.ShaderMaterial({
        uniforms: {
          pointSize: { value: params.pointSize },
          time: { value: 0.0 },
          evaporationSpeed: { value: params.evaporationSpeed },
          maxHeight: { value: params.maxHeight },
          evaporationEnabled: {
            value: params.evaporationEnabled ? 1.0 : 0.0,
          },
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
      this.pointCloudMaterial.uniforms.evaporationSpeed.value = params.evaporationSpeed;
      this.pointCloudMaterial.uniforms.maxHeight.value = params.maxHeight;
      this.pointCloudMaterial.uniforms.evaporationEnabled.value = params.evaporationEnabled ? 1.0 : 0.0;
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
